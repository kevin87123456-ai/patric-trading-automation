import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PublishedAnalysis = typeof publishedAnalyses.$inferSelect;
export type InsertPublishedAnalysis = typeof publishedAnalyses.$inferInsert;

// 網站設定（owner 可編輯的個人介紹等）
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;
