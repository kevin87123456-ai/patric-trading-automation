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
