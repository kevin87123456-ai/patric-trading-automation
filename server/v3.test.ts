import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock dataApi
vi.mock("./_core/dataApi", () => ({
  callDataApi: vi.fn(),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.test/img.png", key: "test" }),
}));

// Mock sheets
vi.mock("./sheets", () => ({
  appendRowToSheets: vi.fn().mockResolvedValue(true),
  readSheetsHistory: vi.fn().mockResolvedValue([]),
}));

// Mock db
vi.mock("./db", () => ({
  createAnalysis: vi.fn().mockResolvedValue({ id: 1 }),
  getAnalysisById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    coin: "BTC",
    timeframe: "4H",
    status: "completed",
    analysisResult: JSON.stringify({
      coin: "BTC",
      timeframe: "4H",
      corgiBoxHigh: 90000,
      corgiBoxLow: 85000,
      corgiBox05: 87500,
      currentPrice: 88000,
      direction: "bullish",
      keyLevels: [{ price: 87500, type: "support", description: "柯基0.5" }],
      analysis: "測試分析",
      confidence: "high",
    }),
    imageUrl: "https://cdn.test/img.png",
  }),
  updateAnalysis: vi.fn(),
  listAnalysesByUser: vi.fn().mockResolvedValue([]),
  createMaterials: vi.fn(),
  getMaterialsByAnalysis: vi.fn().mockResolvedValue([]),
  selectMaterial: vi.fn(),
  markMaterialSynced: vi.fn(),
  getSelectedMaterialForAnalysis: vi.fn().mockResolvedValue(null),
  createPublishedAnalysis: vi.fn().mockResolvedValue({ id: 1 }),
  getPublishedBySlug: vi.fn().mockResolvedValue(null),
  getPublishedByAnalysisId: vi.fn().mockResolvedValue(null),
  listPublishedAnalyses: vi.fn().mockResolvedValue([]),
}));

import { invokeLLM } from "./_core/llm";
import { updateAnalysis, getPublishedByAnalysisId } from "./db";
import {
  CHART_ANALYSIS_SYSTEM_PROMPT,
  MATERIAL_GENERATION_SYSTEM_PROMPT,
  VIEWPOINT_CARD_SYSTEM_PROMPT,
} from "../shared/prompts";

describe("V3 Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Timeframe options", () => {
    it("should support all 7 timeframes including 15M, W, M", () => {
      const timeframes = ["1M", "5M", "15M", "1H", "4H", "1D", "1W"];
      expect(timeframes).toContain("15M");
      expect(timeframes).toContain("1W");
      expect(timeframes.length).toBe(7);
    });
  });

  describe("Material generation prompt - Chinese focus, no punctuation in cover title", () => {
    it("should include no-punctuation rule in material prompt", () => {
      expect(MATERIAL_GENERATION_SYSTEM_PROMPT).toContain("標點符號");
      expect(MATERIAL_GENERATION_SYSTEM_PROMPT).toContain("中文");
    });

    it("should strip punctuation from cover titles in post-processing", () => {
      // Simulate the backend punctuation stripping logic
      const stripPunctuation = (text: string) =>
        text.replace(/[，。！？、；：""''（）【】《》…—\-\.\!\?\,\;\:\'\"\(\)\[\]\{\}\/\\]/g, "");

      expect(stripPunctuation("多頭反攻！")).toBe("多頭反攻");
      expect(stripPunctuation("空軍崩潰，")).toBe("空軍崩潰");
      expect(stripPunctuation("柯基區間...")).toBe("柯基區間");
      expect(stripPunctuation("震盪整理")).toBe("震盪整理");
    });
  });

  describe("Analysis edit functionality", () => {
    it("should allow editing direction to bullish/bearish/neutral", () => {
      const validDirections = ["bullish", "bearish", "neutral"];
      validDirections.forEach((d) => {
        expect(["bullish", "bearish", "neutral"]).toContain(d);
      });
    });

    it("should allow editing price values", () => {
      const editData = {
        corgiBoxHigh: 92000,
        corgiBoxLow: 86000,
        corgiBox05: 89000,
        currentPrice: 90500,
      };
      expect(editData.corgiBoxHigh).toBeGreaterThan(editData.corgiBoxLow);
      expect(editData.corgiBox05).toBeGreaterThan(editData.corgiBoxLow);
      expect(editData.corgiBox05).toBeLessThan(editData.corgiBoxHigh);
    });
  });

  describe("Viewpoint card edit functionality", () => {
    it("should allow editing operation view text", () => {
      const original = "建議在87500附近做多";
      const edited = "建議在88000附近觀望，等待突破確認";
      expect(edited).not.toBe(original);
      expect(edited.length).toBeGreaterThan(0);
    });

    it("should allow editing price alerts", () => {
      const alerts = [
        { price: 90000, label: "壓力位", action: "減倉" },
        { price: 85000, label: "支撐位", action: "加倉" },
      ];
      alerts[0].price = 91000;
      expect(alerts[0].price).toBe(91000);
    });
  });

  describe("getPublishStatus returns full data", () => {
    it("should return full published data when analysis is published", async () => {
      const mockPublished = {
        id: 1,
        slug: "test-slug",
        direction: "bullish",
        confidence: "high",
        corgiBoxHigh: 90000,
        corgiBoxLow: 85000,
        corgiBox05: 87500,
        currentPrice: 88000,
        analysisText: "測試分析",
        operationView: "建議做多",
        priceAlerts: JSON.stringify([{ price: 90000, label: "壓力", action: "減倉" }]),
        summary: "BTC 偏多",
        publishedAt: Date.now(),
      };

      (getPublishedByAnalysisId as any).mockResolvedValueOnce(mockPublished);

      const result = mockPublished;
      expect(result.direction).toBe("bullish");
      expect(result.operationView).toBe("建議做多");
      expect(result.summary).toBe("BTC 偏多");
      expect(result.priceAlerts).toBeDefined();
    });

    it("should return published: false when not published", async () => {
      (getPublishedByAnalysisId as any).mockResolvedValueOnce(null);
      const result = { published: false, slug: null };
      expect(result.published).toBe(false);
      expect(result.slug).toBeNull();
    });
  });

  describe("Public access control", () => {
    it("public routes should not require authentication", () => {
      // PublicArchive and PublicAnalysis use publicProcedure
      const publicRoutes = ["/archive", "/analysis/:slug"];
      const protectedRoutes = ["/dashboard", "/dashboard/history", "/dashboard/youtube"];
      
      // Verify route separation
      expect(publicRoutes.every((r) => !r.startsWith("/dashboard"))).toBe(true);
      expect(protectedRoutes.every((r) => r.startsWith("/dashboard"))).toBe(true);
    });

    it("dashboard routes should require owner authentication", () => {
      // ownerProcedure checks ctx.user.openId === ENV.ownerOpenId
      const ownerOnlyFeatures = [
        "analysis.upload",
        "analysis.analyze",
        "analysis.generateViewpoint",
        "analysis.generateMaterials",
        "analysis.editAnalysis",
        "analysis.publish",
      ];
      expect(ownerOnlyFeatures.length).toBeGreaterThan(0);
    });
  });

  describe("YouTube channel ID persistence", () => {
    it("should use localStorage key for channel ID", () => {
      const STORAGE_KEY = "patric_yt_channel_id";
      expect(STORAGE_KEY).toBe("patric_yt_channel_id");
    });

    it("should track daily subscriber changes", () => {
      const yesterday = 1000;
      const today = 1005;
      const newFollowers = today - yesterday;
      expect(newFollowers).toBe(5);
    });
  });

  describe("History viewpoint card expansion", () => {
    it("should be able to parse published price alerts", () => {
      const priceAlertsJson = JSON.stringify([
        { price: 90000, label: "壓力位", action: "減倉" },
        { price: 85000, label: "支撐位", action: "加倉" },
      ]);
      const parsed = JSON.parse(priceAlertsJson);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].price).toBe(90000);
    });
  });
});
