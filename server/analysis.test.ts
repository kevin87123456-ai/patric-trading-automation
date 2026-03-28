import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-patric",
    email: "patric@example.com",
    name: "Patric",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("config routes", () => {
  it("returns Canva template URL", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.config.getCanvaUrl();
    expect(result).toHaveProperty("url");
    expect(result.url).toContain("canva.com");
  });

  it("returns Google Sheets URL and ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.config.getSheetsUrl();
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("id");
    expect(result.url).toContain("docs.google.com/spreadsheets");
    expect(result.id).toBe("1rYD7tDyZ4HYwpqHmxIfbDGPujj-XNfKH9c9WTiXH68A");
  });
});

describe("auth protection", () => {
  it("auth.me returns null for unauthenticated user", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Patric");
    expect(result?.email).toBe("patric@example.com");
  });

  it("analysis.list requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.analysis.list()).rejects.toThrow();
  });
});

describe("analysis.upload input validation", () => {
  it("rejects empty coin", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analysis.upload({
        imageBase64: "dGVzdA==",
        coin: "",
        timeframe: "4H",
      })
    ).rejects.toThrow();
  });

  it("rejects empty timeframe", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analysis.upload({
        imageBase64: "dGVzdA==",
        coin: "BTC",
        timeframe: "",
      })
    ).rejects.toThrow();
  });

  it("rejects coin longer than 20 chars", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analysis.upload({
        imageBase64: "dGVzdA==",
        coin: "A".repeat(21),
        timeframe: "4H",
      })
    ).rejects.toThrow();
  });
});

describe("prompts module", () => {
  it("buildAnalysisUserPrompt generates correct prompt", async () => {
    const { buildAnalysisUserPrompt } = await import("../shared/prompts");
    const prompt = buildAnalysisUserPrompt("BTC", "4H");
    expect(prompt).toContain("BTC");
    expect(prompt).toContain("4H");
    expect(prompt).toContain("柯基框");
  });

  it("buildMaterialUserPrompt includes analysis data", async () => {
    const { buildMaterialUserPrompt } = await import("../shared/prompts");
    const analysisJson = JSON.stringify({ coin: "ETH", direction: "bullish" });
    const prompt = buildMaterialUserPrompt(analysisJson);
    expect(prompt).toContain("ETH");
    expect(prompt).toContain("bullish");
    expect(prompt).toContain("8 個中文字");
  });

  it("CHART_ANALYSIS_SYSTEM_PROMPT contains key concepts", async () => {
    const { CHART_ANALYSIS_SYSTEM_PROMPT } = await import("../shared/prompts");
    expect(CHART_ANALYSIS_SYSTEM_PROMPT).toContain("柯基區間");
    expect(CHART_ANALYSIS_SYSTEM_PROMPT).toContain("0.5");
    expect(CHART_ANALYSIS_SYSTEM_PROMPT).toContain("BPR");
  });

  it("MATERIAL_GENERATION_SYSTEM_PROMPT enforces 8 char rule", async () => {
    const { MATERIAL_GENERATION_SYSTEM_PROMPT } = await import("../shared/prompts");
    expect(MATERIAL_GENERATION_SYSTEM_PROMPT).toContain("8 個中文字");
    expect(MATERIAL_GENERATION_SYSTEM_PROMPT).toContain("不超過 3 句話");
    expect(MATERIAL_GENERATION_SYSTEM_PROMPT).toContain("Patric");
  });
});

describe("AI correction prompts", () => {
  it("AI_CORRECTION_SYSTEM_PROMPT contains key instructions", async () => {
    const { AI_CORRECTION_SYSTEM_PROMPT } = await import("../shared/prompts");
    expect(AI_CORRECTION_SYSTEM_PROMPT).toContain("Patric");
    expect(AI_CORRECTION_SYSTEM_PROMPT).toContain("direction");
    expect(AI_CORRECTION_SYSTEM_PROMPT).toContain("confidence");
    expect(AI_CORRECTION_SYSTEM_PROMPT).toContain("bearish");
    expect(AI_CORRECTION_SYSTEM_PROMPT).toContain("JSON");
  });

  it("buildAICorrectionContext includes analysis JSON", async () => {
    const { buildAICorrectionContext } = await import("../shared/prompts");
    const analysisJson = JSON.stringify({ coin: "BTC", direction: "bullish", confidence: "medium" });
    const context = buildAICorrectionContext(analysisJson);
    expect(context).toContain("BTC");
    expect(context).toContain("bullish");
    expect(context).toContain("medium");
    expect(context).toContain("校正");
  });

  it("AI_CORRECTION_SYSTEM_PROMPT lists all modifiable fields", async () => {
    const { AI_CORRECTION_SYSTEM_PROMPT } = await import("../shared/prompts");
    const fields = ["direction", "confidence", "corgiBoxHigh", "corgiBoxLow", "corgiBox05", "currentPrice", "analysis"];
    for (const field of fields) {
      expect(AI_CORRECTION_SYSTEM_PROMPT).toContain(field);
    }
  });
});

describe("analysis.aiChat input validation", () => {
  it("rejects unauthenticated user", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analysis.aiChat({
        analysisId: 1,
        messages: [{ role: "user", content: "改成看空" }],
      })
    ).rejects.toThrow();
  });

  it("validates messages array structure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Empty messages should still be valid input (but will fail on DB lookup)
    await expect(
      caller.analysis.aiChat({
        analysisId: 999999,
        messages: [],
      })
    ).rejects.toThrow(); // NOT_FOUND since analysis doesn't exist
  });

  it("rejects invalid role in messages", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analysis.aiChat({
        analysisId: 1,
        messages: [{ role: "invalid" as any, content: "test" }],
      })
    ).rejects.toThrow();
  });
});

describe("analysis.updateTradeNote", () => {
  it("validates input schema - requires publishedId and tradeNote", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Missing tradeNote should fail
    await expect(
      caller.analysis.updateTradeNote({
        publishedId: 1,
        tradeNote: undefined as any,
      })
    ).rejects.toThrow();
  });

  it("accepts valid tradeResult enum values", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Valid input but non-existent publishedId - returns null
    const result = await caller.analysis.updateTradeNote({
      publishedId: 999999,
      tradeNote: "這筆做對了方向判斷",
      tradeResult: "profit",
    });
    // Non-existent ID returns null from updatePublishedAnalysis
    expect(result).toBeNull();
  });

  it("rejects invalid tradeResult enum value", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analysis.updateTradeNote({
        publishedId: 1,
        tradeNote: "test",
        tradeResult: "invalid" as any,
      })
    ).rejects.toThrow();
  });

  it("allows tradeNote without tradeResult", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analysis.updateTradeNote({
      publishedId: 999999,
      tradeNote: "復盤紀錄：止損位設太近",
    });
    expect(result).toBeNull();
  });
});

describe("analysis.uploadPublishedImage", () => {
  it("validates imageType must be profit or loss", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.analysis.uploadPublishedImage({
        publishedId: 1,
        imageBase64: "dGVzdA==",
        mimeType: "image/png",
        imageType: "invalid" as any,
      })
    ).rejects.toThrow();
  });

  it("accepts profit imageType and returns url", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analysis.uploadPublishedImage({
      publishedId: 999999,
      imageBase64: "dGVzdA==",
      mimeType: "image/png",
      imageType: "profit",
    });
    expect(result.imageType).toBe("profit");
    expect(result.url).toBeDefined();
    expect(typeof result.url).toBe("string");
  });

  it("accepts loss imageType and returns url", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analysis.uploadPublishedImage({
      publishedId: 999999,
      imageBase64: "dGVzdA==",
      mimeType: "image/png",
      imageType: "loss",
    });
    expect(result.imageType).toBe("loss");
    expect(result.url).toBeDefined();
    expect(typeof result.url).toBe("string");
  });
});
