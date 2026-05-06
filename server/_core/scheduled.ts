// Scheduled task routes for Manus cron cookie
// Path: /api/scheduled/corgiAnalysis
// Manus cron cookie can only access paths containing "scheduled"

import type { Express, Request, Response } from "express";
import { calculateCorgiBox } from "../services/corgiBox";
import { invokeLLM } from "./llm";
import { ENV } from "./env";
import {
  createAnalysis,
  createPublishedAnalysis,
  getUserByOpenId,
} from "../db";
import { nanoid } from "nanoid";

function generateSlug(coin: string, timeframe: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  return `${dateStr}-${coin.toLowerCase()}-${timeframe.toLowerCase()}-${nanoid(6)}`;
}

async function runCorgiAnalysis() {
  const BINANCE_API = "https://api.binance.com/api/v3/klines";
  const coins = [
    { symbol: "BTCUSDT", name: "BTC" },
    { symbol: "ETHUSDT", name: "ETH" },
  ];
  const results: Array<{ coin: string; slug: string; direction: string; success: boolean; error?: string }> = [];

  // 獲取 owner user
  const ownerUser = await getUserByOpenId(ENV.ownerOpenId);
  if (!ownerUser) {
    throw new Error("Owner user not found");
  }

  for (const { symbol, name } of coins) {
    try {
      // 1. 從 Binance 獲取 4H K線數據（最近 50 根）
      const url = `${BINANCE_API}?symbol=${symbol}&interval=4h&limit=50`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Binance API error: ${resp.status}`);
      const raw = await resp.json() as any[][];
      const klines = raw.map((k: any[]) => ({
        time: k[0] as number,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      // 2. 計算柯基框
      const corgi = calculateCorgiBox(klines);

      // 3. 用 LLM 生成每日劇本
      const now = new Date();
      const twTime = new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(now);

      const analysisInput = JSON.stringify({
        coin: name,
        timeframe: "4H",
        corgiBoxHigh: corgi.high,
        corgiBoxLow: corgi.low,
        corgiBox05: corgi.middle,
        currentPrice: corgi.currentPrice,
        direction: corgi.direction === "long" ? "bullish" : corgi.direction === "short" ? "bearish" : "neutral",
        confidence: corgi.confidence,
        analysis: corgi.analysis,
        keyLevels: corgi.keyLevels,
        generatedAt: twTime,
      });

      const DAILY_SCRIPT_SYSTEM_PROMPT = `你是 Patric（翔翔），台灣加密貨幣交易員。根據柯基框計算數據，生成今日盤前劇本。
【輸出要求】
1. operationView（操作視角）：用白話說明今日操作方向，包含入場位、止損位、目標位、倉位建議，3-5 句話
2. priceAlerts（關鍵價格提醒）：3-5 個關鍵價位，每個包含 price/label/action
3. summary（一句話總結）：Patric 風格，有記憶點
【語氣】直白、有觀點、不廢話`;

      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: DAILY_SCRIPT_SYSTEM_PROMPT },
          { role: "user", content: `根據以下柯基框數據生成今日盤前劇本：\n${analysisInput}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "daily_script",
            strict: true,
            schema: {
              type: "object",
              properties: {
                operationView: { type: "string" },
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
                summary: { type: "string" },
              },
              required: ["operationView", "priceAlerts", "summary"],
              additionalProperties: false,
            },
          },
        },
      });

      const llmContent = llmResult.choices[0]?.message?.content;
      const scriptData = JSON.parse(typeof llmContent === "string" ? llmContent : "{}");

      // 4. 創建 analysis 記錄
      const directionStr = corgi.direction === "long" ? "bullish" : corgi.direction === "short" ? "bearish" : "neutral";
      const analysisResult = JSON.stringify({
        coin: name,
        timeframe: "4H",
        corgiBoxHigh: corgi.high,
        corgiBoxLow: corgi.low,
        corgiBox05: corgi.middle,
        currentPrice: corgi.currentPrice,
        direction: directionStr,
        confidence: corgi.confidence,
        analysis: corgi.analysis,
        keyLevels: corgi.keyLevels,
      });

      const analysis = await createAnalysis({
        userId: ownerUser.id,
        coin: name,
        timeframe: "4H",
        imageUrl: "",
        analysisResult,
        keyLevels: JSON.stringify(corgi.keyLevels),
        status: "completed",
      });

      // 5. 發布到網站
      const slug = generateSlug(name, "4H");
      const keyLevelStr = JSON.stringify(corgi.keyLevels.map(k => ({
        price: k.price,
        label: k.label,
        action: k.note,
      })));

      const published = await createPublishedAnalysis({
        analysisId: analysis.id,
        slug,
        coin: name,
        timeframe: "4H",
        imageUrl: "",
        direction: directionStr,
        confidence: corgi.confidence,
        corgiBoxHigh: String(corgi.high),
        corgiBoxLow: String(corgi.low),
        corgiBox05: String(corgi.middle),
        currentPrice: String(corgi.currentPrice),
        keyLevelsJson: keyLevelStr,
        analysisText: corgi.analysis,
        operationView: scriptData.operationView || "",
        priceAlerts: JSON.stringify(scriptData.priceAlerts || []),
        coverTitle: `${name}盤前劇本`,
        summary: scriptData.summary || "",
      });

      results.push({ coin: name, slug, direction: directionStr, success: true });
    } catch (err: any) {
      console.error(`[scheduled.corgiAnalysis] Failed for ${name}:`, err);
      results.push({ coin: name, slug: "", direction: "", success: false, error: err?.message || String(err) });
    }
  }

  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, results, timestamp: new Date().toISOString() };
}

export function registerScheduledRoutes(app: Express) {
  // Corgi box analysis - called by Manus scheduled task
  app.post("/api/scheduled/corgiAnalysis", async (_req: Request, res: Response) => {
    try {
      console.log("[scheduled] Starting corgi analysis...");
      const result = await runCorgiAnalysis();
      console.log("[scheduled] Corgi analysis completed:", JSON.stringify(result));
      res.json(result);
    } catch (err: any) {
      console.error("[scheduled] Corgi analysis failed:", err);
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });
}
