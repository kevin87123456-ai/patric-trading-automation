import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, index, boolean, decimal, bigint } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  githubToken: text("githubToken"),
  githubUsername: varchar("githubUsername", { length: 39 }),
  githubAuthorizedAt: timestamp("githubAuthorizedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 盤面分析記錄表
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  coin: varchar("coin", { length: 20 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  imageUrl: text("imageUrl").notNull(),
  analysisResult: text("analysisResult"),
  keyLevels: text("keyLevels"),
  status: mysqlEnum("status", ["pending", "analyzing", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

// 生成素材記錄表
export const generatedMaterials = mysqlTable("generated_materials", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(),
  userId: int("userId").notNull(),
  coverTitle: varchar("coverTitle", { length: 30 }).notNull(),
  youtubeTitle: varchar("youtubeTitle", { length: 200 }).notNull(),
  igPost: text("igPost"),
  igStory: text("igStory"),
  isSelected: int("isSelected").default(0).notNull(),
  syncedToSheets: int("syncedToSheets").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedMaterial = typeof generatedMaterials.$inferSelect;
export type InsertGeneratedMaterial = typeof generatedMaterials.$inferInsert;

// 公開盤面分析（發佈後任何人可看）
export const publishedAnalyses = mysqlTable("published_analyses", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(), // 關聯原始分析
  slug: varchar("slug", { length: 100 }).notNull().unique(), // URL slug: 2026-03-29-btc-4h
  coin: varchar("coin", { length: 20 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  imageUrl: text("imageUrl").notNull(),
  // 觀點卡片內容
  direction: varchar("direction", { length: 10 }).notNull(), // bullish/bearish/neutral
  confidence: varchar("confidence", { length: 10 }).notNull(),
  corgiBoxHigh: varchar("corgiBoxHigh", { length: 30 }).notNull(),
  corgiBoxLow: varchar("corgiBoxLow", { length: 30 }).notNull(),
  corgiBox05: varchar("corgiBox05", { length: 30 }).notNull(),
  currentPrice: varchar("currentPrice", { length: 30 }).notNull(),
  keyLevelsJson: text("keyLevelsJson"), // JSON array of key levels
  analysisText: text("analysisText").notNull(), // 分析觀點文字
  operationView: text("operationView").notNull(), // 操作視角建議
  priceAlerts: text("priceAlerts").notNull(), // 關鍵價格提醒 JSON
  coverTitle: varchar("coverTitle", { length: 30 }),
  summary: text("summary"),
  profitImage: text("profitImage"),
  lossImage: text("lossImage"),
  tradeResult: mysqlEnum("tradeResult", ["profit", "loss"]),  // 盈利 or 虧損
  tradeNote: text("tradeNote"),  // 盈利原因 or 虧損復盤
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PublishedAnalysis = typeof publishedAnalyses.$inferSelect;
export type InsertPublishedAnalysis = typeof publishedAnalyses.$inferInsert;

// 市場掃描記錄表
export const marketScans = mysqlTable("market_scans", {
  id: varchar("id", { length: 255 }).primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  direction: mysqlEnum("direction", ["long", "short", "neutral"]).notNull(),
  confidence: mysqlEnum("confidence", ["high", "medium", "low"]).notNull(),
  
  // 柯基框數據
  corgiBoxHigh: decimal("corgiBoxHigh", { precision: 20, scale: 8 }).notNull(),
  corgiBoxLow: decimal("corgiBoxLow", { precision: 20, scale: 8 }).notNull(),
  corgiBoxMiddle: decimal("corgiBoxMiddle", { precision: 20, scale: 8 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 20, scale: 8 }).notNull(),
  
  // 分析內容
  analysis: text("analysis").notNull(),
  viewpoint: text("viewpoint").notNull(),
  bottomText: text("bottomText"),
  
  // 狀態
  published: boolean("published").default(false).notNull(),
  publishedAt: bigint("publishedAt", { mode: "number" }),
  imageUrl: varchar("imageUrl", { length: 500 }),
  
  // 時間戳
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  symbolTimeframeIdx: index("idx_symbol_timeframe").on(table.symbol, table.timeframe),
  createdAtIdx: index("idx_created_at").on(table.createdAt),
  publishedIdx: index("idx_published").on(table.published),
}));

export type MarketScan = typeof marketScans.$inferSelect;
export type InsertMarketScan = typeof marketScans.$inferInsert;

// 關鍵價格提醒表
export const marketScanKeyLevels = mysqlTable("market_scan_key_levels", {
  id: varchar("id", { length: 255 }).primaryKey(),
  scanId: varchar("scanId", { length: 255 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  note: text("note").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  scanIdIdx: index("idx_scan_id").on(table.scanId),
}));

export type MarketScanKeyLevel = typeof marketScanKeyLevels.$inferSelect;
export type InsertMarketScanKeyLevel = typeof marketScanKeyLevels.$inferInsert;

// 掃描任務日誌表
export const scanJobLogs = mysqlTable("scan_job_logs", {
  id: varchar("id", { length: 255 }).primaryKey(),
  jobType: varchar("jobType", { length: 50 }).notNull(), // 'hourly_scan' 或 'daily_report'
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).notNull(),
  
  // 掃描的幣種
  symbols: json("symbols").$type<string[]>().notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  
  // 結果
  scansCreated: int("scansCreated").default(0).notNull(),
  scansPublished: int("scansPublished").default(0).notNull(),
  errorMessage: text("errorMessage"),
  
  // 時間戳
  scheduledAt: bigint("scheduledAt", { mode: "number" }).notNull(),
  startedAt: bigint("startedAt", { mode: "number" }),
  completedAt: bigint("completedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanJobLog = typeof scanJobLogs.$inferSelect;
export type InsertScanJobLog = typeof scanJobLogs.$inferInsert;

// 網站設定（owner 可編輯的個人介紹等）
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;
