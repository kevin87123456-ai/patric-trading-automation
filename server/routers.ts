import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { callDataApi } from "./_core/dataApi";
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
  createPublishedAnalysis,
  getPublishedBySlug,
  getPublishedByAnalysisId,
  listPublishedAnalyses,
} from "./db";
import {
  CHART_ANALYSIS_SYSTEM_PROMPT,
  MATERIAL_GENERATION_SYSTEM_PROMPT,
  VIEWPOINT_CARD_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
  buildMaterialUserPrompt,
  buildViewpointCardPrompt,
} from "../shared/prompts";
import { appendRowToSheets, readSheetsHistory } from "./sheets";

const CANVA_TEMPLATE_URL = "https://www.canva.com/d/fN0X97dPnif9Y6-";
const SHEETS_ID = "1rYD7tDyZ4HYwpqHmxIfbDGPujj-XNfKH9c9WTiXH68A";
const SHEETS_RANGE = "工作表1";

// Owner-only middleware
const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "此系統僅限 Patric 本人使用",
    });
  }
  return next({ ctx });
});

function sanitizeCoverTitle(title: string): string {
  // Remove all punctuation and non-Chinese characters, keep only Chinese chars
  const cleaned = title.replace(/[^\u4e00-\u9fff]/g, "");
  const chars = Array.from(cleaned);
  if (chars.length >= 6 && chars.length <= 10) return cleaned;
  // If too long, trim to 8; if too short, return as-is
  if (chars.length > 10) return chars.slice(0, 8).join("");
  return cleaned;
}

function validateIgStory(story: string): string {
  const sentences = story.split(/[。！？\n]/).filter(s => s.trim().length > 0);
  if (sentences.length > 3) {
    return sentences.slice(0, 3).join("。") + "。";
  }
  return story;
}

function generateSlug(coin: string, timeframe: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  return `${dateStr}-${coin.toLowerCase()}-${timeframe.toLowerCase()}-${nanoid(6)}`;
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

    // Edit analysis result (key levels, direction)
    editAnalysis: ownerProcedure
      .input(z.object({
        analysisId: z.number(),
        keyLevels: z.array(z.object({
          price: z.number(),
          type: z.string(),
          description: z.string(),
        })).optional(),
        direction: z.enum(["bullish", "bearish", "neutral"]).optional(),
        corgiBoxHigh: z.number().optional(),
        corgiBoxLow: z.number().optional(),
        corgiBox05: z.number().optional(),
        currentPrice: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        let parsed: any = {};
        try { parsed = JSON.parse(analysis.analysisResult || "{}"); } catch {}

        if (input.direction !== undefined) parsed.direction = input.direction;
        if (input.corgiBoxHigh !== undefined) parsed.corgiBoxHigh = input.corgiBoxHigh;
        if (input.corgiBoxLow !== undefined) parsed.corgiBoxLow = input.corgiBoxLow;
        if (input.corgiBox05 !== undefined) parsed.corgiBox05 = input.corgiBox05;
        if (input.currentPrice !== undefined) parsed.currentPrice = input.currentPrice;
        if (input.keyLevels !== undefined) parsed.keyLevels = input.keyLevels;

        const newKeyLevelsJson = JSON.stringify(parsed.keyLevels || []);

        const updated = await updateAnalysis(analysis.id, {
          analysisResult: JSON.stringify(parsed),
          keyLevels: newKeyLevelsJson,
        });

        return updated;
      }),

    // Generate viewpoint card content (for screenshot sharing)
    generateViewpoint: ownerProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (!analysis.analysisResult) throw new TRPCError({ code: "BAD_REQUEST", message: "分析尚未完成" });

        const result = await invokeLLM({
          messages: [
            { role: "system", content: VIEWPOINT_CARD_SYSTEM_PROMPT },
            { role: "user", content: buildViewpointCardPrompt(analysis.analysisResult) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "viewpoint_card",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  operationView: { type: "string", description: "操作視角建議" },
                  priceAlerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        price: { type: "number" },
                        label: { type: "string" },
                        action: { type: "string" },
                      },
                      required: ["price", "label", "action"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "一句話總結" },
                },
                required: ["operationView", "priceAlerts", "summary"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = result.choices[0]?.message?.content;
        return JSON.parse(typeof content === "string" ? content : "{}");
      }),

    // Publish analysis to public page
    publish: ownerProcedure
      .input(z.object({
        analysisId: z.number(),
        operationView: z.string().min(1),
        priceAlerts: z.string().min(1), // JSON string
        coverTitle: z.string().optional(),
        summary: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (!analysis.analysisResult) throw new TRPCError({ code: "BAD_REQUEST", message: "分析尚未完成" });

        // Check if already published
        const existing = await getPublishedByAnalysisId(analysis.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "此分析已發佈" });

        let parsed: any = {};
        try { parsed = JSON.parse(analysis.analysisResult); } catch {}

        const slug = generateSlug(analysis.coin, analysis.timeframe);

        const published = await createPublishedAnalysis({
          analysisId: analysis.id,
          slug,
          coin: analysis.coin,
          timeframe: analysis.timeframe,
          imageUrl: analysis.imageUrl,
          direction: parsed.direction || "neutral",
          confidence: parsed.confidence || "medium",
          corgiBoxHigh: String(parsed.corgiBoxHigh || 0),
          corgiBoxLow: String(parsed.corgiBoxLow || 0),
          corgiBox05: String(parsed.corgiBox05 || 0),
          currentPrice: String(parsed.currentPrice || 0),
          keyLevelsJson: analysis.keyLevels || "[]",
          analysisText: parsed.analysis || "",
          operationView: input.operationView,
          priceAlerts: input.priceAlerts,
          coverTitle: input.coverTitle || parsed.coin || "",
          summary: input.summary || "",
        });

        return published;
      }),

    // Check if analysis is published
    getPublishStatus: ownerProcedure
      .input(z.object({ analysisId: z.number() }))
      .query(async ({ input }) => {
        const published = await getPublishedByAnalysisId(input.analysisId);
        if (!published) return { published: false, slug: null };
        return {
          published: true,
          slug: published.slug,
          direction: published.direction,
          confidence: published.confidence,
          corgiBoxHigh: published.corgiBoxHigh,
          corgiBoxLow: published.corgiBoxLow,
          corgiBox05: published.corgiBox05,
          currentPrice: published.currentPrice,
          analysisText: published.analysisText,
          operationView: published.operationView,
          priceAlerts: published.priceAlerts,
          summary: published.summary,
          publishedAt: published.publishedAt,
        };
      }),

    // Generate materials from analysis
    generateMaterials: ownerProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (!analysis.analysisResult) throw new TRPCError({ code: "BAD_REQUEST", message: "分析尚未完成" });

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
                        coverTitle: { type: "string" },
                        youtubeTitle: { type: "string" },
                        igPost: { type: "string" },
                        igStory: { type: "string" },
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
        const parsedContent = JSON.parse(typeof content === "string" ? content : "{}");
        const options = parsedContent.options || [];

        const materialsData = options.slice(0, 3).map((opt: any) => {
          const validatedTitle = sanitizeCoverTitle(opt.coverTitle);
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
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "素材生成失敗" });
        }

        return await createMaterials(materialsData);
      }),

    selectMaterial: ownerProcedure
      .input(z.object({ materialId: z.number() }))
      .mutation(async ({ input }) => {
        return await selectMaterial(input.materialId);
      }),

    get: ownerProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.id);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const materials = await getMaterialsByAnalysis(analysis.id);
        return { analysis, materials };
      }),

    list: ownerProcedure.query(async ({ ctx }) => {
      return listAnalysesByUser(ctx.user.id);
    }),

    syncToSheets: ownerProcedure
      .input(z.object({ analysisId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        const material = await getSelectedMaterialForAnalysis(analysis.id);
        if (!material) throw new TRPCError({ code: "BAD_REQUEST", message: "請先選擇一個方案" });

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

        const success = await appendRowToSheets(row);
        if (!success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Google Sheets 同步失敗" });
        }

        await markMaterialSynced(material.id);
        return { success: true, row, sheetsId: SHEETS_ID, material };
      }),

    sheetsHistory: ownerProcedure.query(async () => {
      const rows = await readSheetsHistory();
      return { rows };
    }),
  }),

  // ===== Public routes (no auth required) =====
  public: router({
    // Get single published analysis by slug
    getAnalysis: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const published = await getPublishedBySlug(input.slug);
        if (!published) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此盤面分析" });
        return published;
      }),

    // List all published analyses (public archive)
    listAnalyses: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(30) }).optional())
      .query(async ({ input }) => {
        return listPublishedAnalyses(input?.limit || 30);
      }),
  }),

  // ===== YouTube Data =====
  youtube: router({
    channelDetails: ownerProcedure
      .input(z.object({ channelId: z.string() }))
      .query(async ({ input }) => {
        try {
          const data = await callDataApi("Youtube/get_channel_details", {
            query: { id: input.channelId, hl: "zh-TW" },
          });
          return data as any;
        } catch (error: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `YouTube API 錯誤: ${error.message}` });
        }
      }),

    channelVideos: ownerProcedure
      .input(z.object({
        channelId: z.string(),
        filter: z.enum(["videos_latest", "streams_latest", "shorts_latest"]).default("videos_latest"),
        cursor: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const query: Record<string, unknown> = {
            id: input.channelId,
            filter: input.filter,
            hl: "zh-TW",
            gl: "TW",
          };
          if (input.cursor) query.cursor = input.cursor;
          const data = await callDataApi("Youtube/get_channel_videos", { query });
          return data as any;
        } catch (error: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `YouTube API 錯誤: ${error.message}` });
        }
      }),

    search: ownerProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const data = await callDataApi("Youtube/search", {
            query: { q: input.query, hl: "zh-TW", gl: "TW" },
          });
          return data as any;
        } catch (error: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `YouTube API 錯誤: ${error.message}` });
        }
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
