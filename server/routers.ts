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
  updatePublishedAnalysis,
  getAllSettings,
  getSetting,
  upsertSetting,
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
  const cleaned = title.replace(/[^\u4e00-\u9fff]/g, "");
  const chars = Array.from(cleaned);
  if (chars.length >= 6 && chars.length <= 10) return cleaned;
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

    publish: ownerProcedure
      .input(z.object({
        analysisId: z.number(),
        operationView: z.string().min(1),
        priceAlerts: z.string().min(1),
        coverTitle: z.string().optional(),
        summary: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
        if (analysis.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (!analysis.analysisResult) throw new TRPCError({ code: "BAD_REQUEST", message: "分析尚未完成" });

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

    // Edit published analysis (owner only - add profit/loss images, edit text)
    editPublished: ownerProcedure
      .input(z.object({
        publishedId: z.number(),
        operationView: z.string().optional(),
        analysisText: z.string().optional(),
        summary: z.string().optional(),
        profitImageBase64: z.string().optional(),
        profitImageMime: z.string().optional(),
        lossImageBase64: z.string().optional(),
        lossImageMime: z.string().optional(),
        direction: z.enum(["bullish", "bearish", "neutral"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData: Record<string, any> = {};

        if (input.operationView !== undefined) updateData.operationView = input.operationView;
        if (input.analysisText !== undefined) updateData.analysisText = input.analysisText;
        if (input.summary !== undefined) updateData.summary = input.summary;
        if (input.direction !== undefined) updateData.direction = input.direction;

        // Upload profit image to S3 and store URL
        if (input.profitImageBase64) {
          const buffer = Buffer.from(input.profitImageBase64, "base64");
          const ext = input.profitImageMime?.includes("png") ? "png" : "jpg";
          const fileKey = `published/${input.publishedId}/profit-${nanoid(6)}.${ext}`;
          const { url } = await storagePut(fileKey, buffer, input.profitImageMime || "image/png");
          updateData.profitImage = url;
        }

        // Upload loss image to S3 and store URL
        if (input.lossImageBase64) {
          const buffer = Buffer.from(input.lossImageBase64, "base64");
          const ext = input.lossImageMime?.includes("png") ? "png" : "jpg";
          const fileKey = `published/${input.publishedId}/loss-${nanoid(6)}.${ext}`;
          const { url } = await storagePut(fileKey, buffer, input.lossImageMime || "image/png");
          updateData.lossImage = url;
        }

        if (Object.keys(updateData).length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "沒有要更新的內容" });
        }

        return await updatePublishedAnalysis(input.publishedId, updateData);
      }),

    // Upload image for published analysis (profit/loss screenshots)
    uploadPublishedImage: ownerProcedure
      .input(z.object({
        publishedId: z.number(),
        imageBase64: z.string(),
        mimeType: z.string().default("image/png"),
        imageType: z.enum(["profit", "loss"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.includes("png") ? "png" : "jpg";
        const fileKey = `published/${input.publishedId}/${input.imageType}-${nanoid(6)}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url, imageType: input.imageType };
      }),

    getPublishStatus: ownerProcedure
      .input(z.object({ analysisId: z.number() }))
      .query(async ({ input }) => {
        const published = await getPublishedByAnalysisId(input.analysisId);
        if (!published) return { published: false, slug: null };
        return {
          published: true,
          slug: published.slug,
          id: published.id,
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
          profitImage: (published as any).profitImage || null,
          lossImage: (published as any).lossImage || null,
          publishedAt: published.publishedAt,
        };
      }),

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
    getAnalysis: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const published = await getPublishedBySlug(input.slug);
        if (!published) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此盤面分析" });
        return {
          ...published,
          profitImage: (published as any).profitImage || null,
          lossImage: (published as any).lossImage || null,
        };
      }),

    listAnalyses: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(30) }).optional())
      .query(async ({ input }) => {
        return listPublishedAnalyses(input?.limit || 30);
      }),

    // Get about page data (public)
    getAboutData: publicProcedure.query(async () => {
      const settings = await getAllSettings();
      return {
        intro: settings.about_intro || "",
        whatIDo: settings.about_what_i_do || "",
        philosophy: settings.about_philosophy || "",
        youtube: settings.about_youtube || "",
        ig: settings.about_ig || "",
        whatsapp: settings.about_whatsapp || "",
        freeDoc: settings.about_free_doc || "",
        freeDocTitle: settings.about_free_doc_title || "",
      };
    }),
  }),

  // ===== Site Settings (owner only) =====
  settings: router({
    getAll: ownerProcedure.query(async () => {
      return await getAllSettings();
    }),

    update: ownerProcedure
      .input(z.object({
        key: z.string().min(1),
        value: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await upsertSetting(input.key, input.value);
      }),

    updateMultiple: ownerProcedure
      .input(z.object({
        settings: z.array(z.object({
          key: z.string().min(1),
          value: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        for (const s of input.settings) {
          await upsertSetting(s.key, s.value);
        }
        return { success: true };
      }),
  }),

  // ===== YouTube Data =====
  youtube: router({
    channelDetails: ownerProcedure
      .input(z.object({ channelId: z.string().optional() }))
      .query(async ({ input }) => {
        const channelId = input.channelId || await getSetting("youtube_channel_id") || "";
        if (!channelId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "請先設定 YouTube 頻道 ID" });
        }
        try {
          // Scrape YouTube channel page for stats (Data API doesn't support this channel)
          const url = `https://www.youtube.com/channel/${channelId}`;
          const resp = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
            },
          });
          const html = await resp.text();
          const match = html.match(/var ytInitialData = (\{.*?\});/);
          if (!match) throw new Error("無法取得頻道資料");
          const ytData = JSON.parse(match[1]);

          const meta = ytData?.metadata?.channelMetadataRenderer || {};
          const headerContent = ytData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel || {};
          const metadataRows = headerContent?.metadata?.contentMetadataViewModel?.metadataRows || [];

          let subscribersText = "";
          let videosText = "";
          for (const row of metadataRows) {
            for (const part of row.metadataParts || []) {
              const text = part?.text?.content || "";
              if (text.includes("訂閱") || text.includes("subscriber")) subscribersText = text;
              else if (text.includes("影片") || text.includes("video")) videosText = text;
            }
          }

          const subscriberCount = parseInt(subscribersText.replace(/[^0-9]/g, "")) || 0;
          const videoCount = parseInt(videosText.replace(/[^0-9]/g, "")) || 0;
          const avatarUrl = meta?.avatar?.thumbnails?.[0]?.url || "";
          const bannerUrl = ytData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources?.[0]?.url || "";

          return {
            channelId: meta.externalId || channelId,
            title: meta.title || headerContent?.title?.dynamicTextViewModel?.text?.content || "",
            description: meta.description || "",
            handle: meta.vanityChannelUrl?.split("@")[1] || "",
            stats: {
              subscribers: subscriberCount,
              subscribersText,
              videos: videoCount,
              videosText,
            },
            avatar: [{ url: avatarUrl, width: 900, height: 900 }],
            banner: bannerUrl ? [{ url: bannerUrl }] : [],
          };
        } catch (error: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `YouTube 資料取得失敗: ${error.message}` });
        }
      }),

    channelVideos: ownerProcedure
      .input(z.object({
        channelId: z.string().optional(),
        filter: z.enum(["videos_latest", "streams_latest", "shorts_latest"]).default("videos_latest"),
        cursor: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const channelId = input.channelId || await getSetting("youtube_channel_id") || "";
        if (!channelId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "請先設定 YouTube 頻道 ID" });
        }
        try {
          const query: Record<string, unknown> = {
            id: channelId,
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

    getChannelId: ownerProcedure.query(async () => {
      const channelId = await getSetting("youtube_channel_id");
      return { channelId: channelId || "" };
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
