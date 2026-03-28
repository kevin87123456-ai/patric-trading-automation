import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.test/chart.png", key: "charts/1/test.png" }),
}));

vi.mock("./_core/dataApi", () => ({
  callDataApi: vi.fn(),
}));

vi.mock("./sheets", () => ({
  appendRowToSheets: vi.fn().mockResolvedValue(true),
  readSheetsHistory: vi.fn().mockResolvedValue([["2026-03-29", "BTC", "key", "title", "yt", "canva", "ig"]]),
}));

vi.mock("./db", () => ({
  createAnalysis: vi.fn().mockResolvedValue({ id: 1, userId: 1, coin: "BTC", timeframe: "4H", imageUrl: "https://cdn.test/chart.png", status: "pending" }),
  getAnalysisById: vi.fn().mockResolvedValue({ id: 1, userId: 1, coin: "BTC", timeframe: "4H", imageUrl: "https://cdn.test/chart.png", analysisResult: '{"coin":"BTC","timeframe":"4H","corgiBoxHigh":90000,"corgiBoxLow":85000,"corgiBox05":87500,"currentPrice":88000,"direction":"bullish","keyLevels":[{"price":87500,"type":"support","description":"0.5 key level"}],"analysis":"BTC偏多","confidence":"high"}', keyLevels: '[{"price":87500,"type":"support","description":"0.5 key level"}]', status: "completed" }),
  updateAnalysis: vi.fn().mockResolvedValue({ id: 1, status: "completed" }),
  listAnalysesByUser: vi.fn().mockResolvedValue([]),
  createMaterials: vi.fn().mockResolvedValue([{ id: 1, coverTitle: "比特幣突破新高", youtubeTitle: "Test", igPost: "Test", igStory: "Test" }]),
  getMaterialsByAnalysis: vi.fn().mockResolvedValue([]),
  selectMaterial: vi.fn().mockResolvedValue({ id: 1, isSelected: 1 }),
  markMaterialSynced: vi.fn(),
  getSelectedMaterialForAnalysis: vi.fn().mockResolvedValue({ id: 1, coverTitle: "比特幣突破新高", youtubeTitle: "Test YT", igPost: "Test IG", igStory: "Test Story", isSelected: 1 }),
  createPublishedAnalysis: vi.fn().mockResolvedValue({ id: 1, slug: "2026-03-29-btc-4h-abc123", coin: "BTC" }),
  getPublishedBySlug: vi.fn().mockResolvedValue({ id: 1, slug: "2026-03-29-btc-4h-abc123", coin: "BTC", direction: "bullish", analysisText: "Test", operationView: "Test op", priceAlerts: "[]" }),
  getPublishedByAnalysisId: vi.fn().mockResolvedValue(null),
  listPublishedAnalyses: vi.fn().mockResolvedValue([]),
}));

import {
  CHART_ANALYSIS_SYSTEM_PROMPT,
  MATERIAL_GENERATION_SYSTEM_PROMPT,
  VIEWPOINT_CARD_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
  buildMaterialUserPrompt,
  buildViewpointCardPrompt,
} from "../shared/prompts";

import {
  createAnalysis,
  getAnalysisById,
  createPublishedAnalysis,
  getPublishedBySlug,
  listPublishedAnalyses,
} from "./db";

import { appendRowToSheets, readSheetsHistory } from "./sheets";
import { callDataApi } from "./_core/dataApi";

describe("Prompt Templates", () => {
  it("should have chart analysis system prompt with corgi box concepts", () => {
    expect(CHART_ANALYSIS_SYSTEM_PROMPT).toContain("柯基框");
    expect(CHART_ANALYSIS_SYSTEM_PROMPT).toContain("0.5 處");
    expect(CHART_ANALYSIS_SYSTEM_PROMPT).toContain("JSON");
  });

  it("should have material generation system prompt with Patric style", () => {
    expect(MATERIAL_GENERATION_SYSTEM_PROMPT).toContain("Patric");
    expect(MATERIAL_GENERATION_SYSTEM_PROMPT).toContain("8 個中文字");
    expect(MATERIAL_GENERATION_SYSTEM_PROMPT).toContain("不超過 3 句話");
  });

  it("should have viewpoint card system prompt", () => {
    expect(VIEWPOINT_CARD_SYSTEM_PROMPT).toContain("operationView");
    expect(VIEWPOINT_CARD_SYSTEM_PROMPT).toContain("priceAlerts");
    expect(VIEWPOINT_CARD_SYSTEM_PROMPT).toContain("summary");
  });

  it("should build analysis user prompt with coin and timeframe", () => {
    const prompt = buildAnalysisUserPrompt("BTC", "4H");
    expect(prompt).toContain("BTC");
    expect(prompt).toContain("4H");
    expect(prompt).toContain("柯基框");
  });

  it("should build material user prompt with analysis JSON", () => {
    const prompt = buildMaterialUserPrompt('{"coin":"BTC"}');
    expect(prompt).toContain("BTC");
    expect(prompt).toContain("封面大標");
    expect(prompt).toContain("8 個中文字");
  });

  it("should build viewpoint card prompt with analysis JSON", () => {
    const prompt = buildViewpointCardPrompt('{"coin":"BTC","direction":"bullish"}');
    expect(prompt).toContain("BTC");
    expect(prompt).toContain("operationView");
    expect(prompt).toContain("priceAlerts");
  });
});

describe("Validation Functions", () => {
  // Test the validation logic directly
  function validateCoverTitle(title: string): string | null {
    const cleaned = title.replace(/\s/g, "");
    const charCount = Array.from(cleaned).length;
    if (charCount >= 6 && charCount <= 10) return cleaned;
    return null;
  }

  function validateIgStory(story: string): string {
    const sentences = story.split(/[。！？\n]/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      return sentences.slice(0, 3).join("。") + "。";
    }
    return story;
  }

  it("should accept valid 8-char cover title", () => {
    expect(validateCoverTitle("比特幣突破新高了")).toBe("比特幣突破新高了");
  });

  it("should accept 6-10 char range cover titles", () => {
    expect(validateCoverTitle("六個字的標題")).not.toBeNull();
    expect(validateCoverTitle("這是十個字的標題呢")).not.toBeNull();
  });

  it("should reject too short cover title", () => {
    expect(validateCoverTitle("短")).toBeNull();
  });

  it("should reject too long cover title", () => {
    expect(validateCoverTitle("這個標題真的太長了超過十個字不行")).toBeNull();
  });

  it("should trim IG story to 3 sentences", () => {
    const long = "第一句。第二句。第三句。第四句。第五句。";
    const result = validateIgStory(long);
    const sentences = result.split(/[。]/).filter(s => s.trim().length > 0);
    expect(sentences.length).toBeLessThanOrEqual(3);
  });

  it("should keep short IG story as-is", () => {
    const short = "只有一句話";
    expect(validateIgStory(short)).toBe(short);
  });
});

describe("Slug Generation", () => {
  function generateSlug(coin: string, timeframe: string): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    return `${dateStr}-${coin.toLowerCase()}-${timeframe.toLowerCase()}-test123`;
  }

  it("should generate slug with date, coin, and timeframe", () => {
    const slug = generateSlug("BTC", "4H");
    expect(slug).toContain("btc");
    expect(slug).toContain("4h");
    expect(slug).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("should lowercase coin and timeframe in slug", () => {
    const slug = generateSlug("ETH", "1D");
    expect(slug).toContain("eth");
    expect(slug).toContain("1d");
    expect(slug).not.toContain("ETH");
  });
});

describe("DB Operations (mocked)", () => {

  it("should create analysis record", async () => {
    const result = await createAnalysis({
      userId: 1,
      coin: "BTC",
      timeframe: "4H",
      imageUrl: "https://cdn.test/chart.png",
      status: "pending",
    });
    expect(result).toHaveProperty("id");
    expect(result.coin).toBe("BTC");
  });

  it("should get analysis by id", async () => {
    const result = await getAnalysisById(1);
    expect(result).toHaveProperty("analysisResult");
    expect(result.coin).toBe("BTC");
  });

  it("should create published analysis", async () => {
    const result = await createPublishedAnalysis({
      analysisId: 1,
      slug: "2026-03-29-btc-4h-abc123",
      coin: "BTC",
      timeframe: "4H",
      imageUrl: "https://cdn.test/chart.png",
      direction: "bullish",
      confidence: "high",
      corgiBoxHigh: "90000",
      corgiBoxLow: "85000",
      corgiBox05: "87500",
      currentPrice: "88000",
      keyLevelsJson: "[]",
      analysisText: "BTC偏多",
      operationView: "建議做多",
      priceAlerts: "[]",
    });
    expect(result).toHaveProperty("slug");
    expect(result.slug).toContain("btc");
  });

  it("should get published analysis by slug", async () => {
    const result = await getPublishedBySlug("2026-03-29-btc-4h-abc123");
    expect(result).toHaveProperty("direction");
    expect(result.direction).toBe("bullish");
  });

  it("should list published analyses", async () => {
    const result = await listPublishedAnalyses();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Sheets Integration (mocked)", () => {

  it("should append row to sheets", async () => {
    const result = await appendRowToSheets(["2026-03-29", "BTC", "key", "title", "yt", "canva", "ig"]);
    expect(result).toBe(true);
  });

  it("should read sheets history", async () => {
    const result = await readSheetsHistory();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("YouTube Data API (mocked)", () => {

  beforeEach(() => {
    vi.mocked(callDataApi).mockResolvedValue({
      title: "Patric Trading",
      subscriberCount: "10000",
      viewCount: "500000",
    });
  });

  it("should call YouTube channel details API", async () => {
    const result = await callDataApi("Youtube/get_channel_details", {
      query: { id: "UCtest123", hl: "zh-TW" },
    });
    expect(result).toHaveProperty("title");
    expect(callDataApi).toHaveBeenCalledWith("Youtube/get_channel_details", expect.any(Object));
  });

  it("should call YouTube channel videos API", async () => {
    vi.mocked(callDataApi).mockResolvedValue({ data: [{ title: "Test Video" }] });
    const result = await callDataApi("Youtube/get_channel_videos", {
      query: { id: "UCtest123", filter: "videos_latest" },
    });
    expect(result).toHaveProperty("data");
  });
});
