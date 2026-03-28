import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";
import {
  createAnalysis,
  getAnalysisById,
  updateAnalysis,
  listAnalysesByUser,
  createMaterials,
  getMaterialsByAnalysis,
  selectMaterial,
  markMaterialSynced,
  getSelectedMaterialForAnalysis,
} from "./db";
import {
  CHART_ANALYSIS_SYSTEM_PROMPT,
  MATERIAL_GENERATION_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
  buildMaterialUserPrompt,
} from "../shared/prompts";
import { appendRowToSheets, readSheetsHistory } from "./sheets";

const CANVA_TEMPLATE_URL = "https://www.canva.com/d/fN0X97dPnif9Y6-";
const SHEETS_ID = "1rYD7tDyZ4HYwpqHmxIfbDGPujj-XNfKH9c9WTiXH68A";
const SHEETS_RANGE = "工作表1";

// Owner-only middleware: only Patric (the project owner) can access
const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Allow owner (by openId) or admin role
  if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "此系統僅限 Patric 本人使用",
    });
  }
  return next({ ctx });
});

/**
 * Validate cover title is exactly 8 Chinese characters
 * Returns trimmed title or null if invalid
 */
function validateCoverTitle(title: string): string | null {
  const cleaned = title.replace(/\s/g, "");
  // Count characters (Chinese chars, punctuation, etc.)
  const charCount = Array.from(cleaned).length;
  if (charCount >= 6 && charCount <= 10) {
    // Accept 6-10 range to be lenient, but prefer exactly 8
    return cleaned;
  }
  return null;
}

/**
 * Validate IG story is at most 3 sentences
 */
function validateIgStory(story: string): string {
  // Split by common sentence endings
  const sentences = story.split(/[。！？\n]/).filter(s => s.trim().length > 0);
  if (sentences.length > 3) {
    // Truncate to first 3 sentences
    return sentences.slice(0, 3).join("。") + "。";
  }
  return story;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  analysis: router({
    // Upload image and create analysis record
    upload: ownerProcedure
      .input(z.object({
        imageBase64: z.string(),
        coin: z.string().min(1).max(20),
        timeframe: z.string().min(1).max(10),
        mimeType: z.string().default("image/png"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.includes("png") ? "png" : "jpg";
        const fileKey = `charts/${ctx.user.id}/${nanoid()}.${ext}`;
        const { url: imageUrl } = await storagePut(fileKey, buffer, input.mimeType);

        const analysis = await createAnalysis({
          userId: ctx.user.id,
          coin: input.coin.toUpperCase(),
          timeframe: input.timeframe,
          imageUrl,
          status: "pending",
        });

        return analysis;
      }),

    // Run LLM analysis on uploaded chart
    analyze: ownerProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        await updateAnalysis(analysis.id, { status: "analyzing" });

        try {
          const result = await invokeLLM({
            messages: [
              { role: "system", content: CHART_ANALYSIS_SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  { type: "text", text: buildAnalysisUserPrompt(analysis.coin, analysis.timeframe) },
                  { type: "image_url", image_url: { url: analysis.imageUrl, detail: "high" } },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "chart_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    coin: { type: "string" },
                    timeframe: { type: "string" },
                    corgiBoxHigh: { type: "number" },
                    corgiBoxLow: { type: "number" },
                    corgiBox05: { type: "number" },
                    currentPrice: { type: "number" },
                    direction: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                    keyLevels: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          price: { type: "number" },
                          type: { type: "string" },
                          description: { type: "string" },
                        },
                        required: ["price", "type", "description"],
                        additionalProperties: false,
                      },
                    },
                    analysis: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["coin", "timeframe", "corgiBoxHigh", "corgiBoxLow", "corgiBox05", "currentPrice", "direction", "keyLevels", "analysis", "confidence"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices[0]?.message?.content;
          const analysisText = typeof content === "string" ? content : "";
          let keyLevelsJson = "[]";
          try {
            const parsed = JSON.parse(analysisText);
            keyLevelsJson = JSON.stringify(parsed.keyLevels || []);
          } catch {}

          const updated = await updateAnalysis(analysis.id, {
            analysisResult: analysisText,
            keyLevels: keyLevelsJson,
            status: "completed",
          });

          return updated;
        } catch (error: any) {
          await updateAnalysis(analysis.id, { status: "failed" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Analysis failed: ${error.message}` });
        }
      }),

    // Generate materials from analysis
    generateMaterials: ownerProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (!analysis.analysisResult) throw new TRPCError({ code: "BAD_REQUEST", message: "Analysis not completed yet" });

        const result = await invokeLLM({
          messages: [
            { role: "system", content: MATERIAL_GENERATION_SYSTEM_PROMPT },
            { role: "user", content: buildMaterialUserPrompt(analysis.analysisResult) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "materials",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        coverTitle: { type: "string", description: "剛好8個中文字的封面大標" },
                        youtubeTitle: { type: "string", description: "YouTube爆款標題" },
                        igPost: { type: "string", description: "IG打臉教學型貼文" },
                        igStory: { type: "string", description: "IG限動文案（不超過3句）" },
                      },
                      required: ["coverTitle", "youtubeTitle", "igPost", "igStory"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["options"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = result.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");
        const options = parsed.options || [];

        // Validate and clean generated materials
        const materialsData = options.slice(0, 3).map((opt: any) => {
          const validatedTitle = validateCoverTitle(opt.coverTitle) || opt.coverTitle.substring(0, 8);
          const validatedStory = validateIgStory(opt.igStory || "");
          return {
            analysisId: analysis.id,
            userId: ctx.user.id,
            coverTitle: validatedTitle,
            youtubeTitle: opt.youtubeTitle,
            igPost: opt.igPost,
            igStory: validatedStory,
          };
        });

        if (materialsData.length === 0) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "素材生成失敗，請重試" });
        }

        const materials = await createMaterials(materialsData);
        return materials;
      }),

    // Select a material option
    selectMaterial: ownerProcedure
      .input(z.object({ materialId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const material = await selectMaterial(input.materialId);
        return material;
      }),

    // Get analysis with materials
    get: ownerProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.id);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const materials = await getMaterialsByAnalysis(analysis.id);
        return { analysis, materials };
      }),

    // List all analyses
    list: ownerProcedure.query(async ({ ctx }) => {
      return listAnalysesByUser(ctx.user.id);
    }),

    // Sync selected material to Google Sheets (real API call)
    syncToSheets: ownerProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        const material = await getSelectedMaterialForAnalysis(analysis.id);
        if (!material) throw new TRPCError({ code: "BAD_REQUEST", message: "請先選擇一個方案" });

        // Parse analysis result for key levels
        let keyLevelStr = "";
        try {
          const parsed = JSON.parse(analysis.analysisResult || "{}");
          keyLevelStr = `柯基框 ${parsed.corgiBoxLow}-${parsed.corgiBoxHigh}, 0.5處: ${parsed.corgiBox05}`;
        } catch {}

        const today = new Date().toISOString().split("T")[0];
        const row = [
          today,
          analysis.coin,
          keyLevelStr,
          material.coverTitle,
          material.youtubeTitle,
          CANVA_TEMPLATE_URL,
          material.igPost?.substring(0, 200) || "",
        ];

        // Actually write to Google Sheets
        const success = await appendRowToSheets(row);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Google Sheets 同步失敗，請稍後重試",
          });
        }

        // Mark as synced only after successful write
        await markMaterialSynced(material.id);

        return {
          success: true,
          row,
          sheetsId: SHEETS_ID,
          sheetsRange: SHEETS_RANGE,
          material,
        };
      }),

    // Read history from Google Sheets
    sheetsHistory: ownerProcedure.query(async () => {
      const rows = await readSheetsHistory();
      return { rows };
    }),
  }),

  config: router({
    getCanvaUrl: publicProcedure.query(() => {
      return { url: CANVA_TEMPLATE_URL };
    }),
    getSheetsUrl: publicProcedure.query(() => {
      return { url: `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/edit`, id: SHEETS_ID };
    }),
  }),
});

export type AppRouter = typeof appRouter;
