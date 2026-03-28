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
  coin: varchar("coin", { length: 20 }).notNull(), // BTC, ETH, SOL...
  timeframe: varchar("timeframe", { length: 10 }).notNull(), // 4H, 15M, 1D...
  imageUrl: text("imageUrl").notNull(), // S3 上傳後的圖片 URL
  analysisResult: text("analysisResult"), // LLM 分析結果（JSON string）
  keyLevels: text("keyLevels"), // 關鍵位階 JSON
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
  coverTitle: varchar("coverTitle", { length: 30 }).notNull(), // 8 字封面大標
  youtubeTitle: varchar("youtubeTitle", { length: 200 }).notNull(), // YouTube 標題
  igPost: text("igPost"), // IG 貼文文案
  igStory: text("igStory"), // IG 限動文案（≤3 句）
  isSelected: int("isSelected").default(0).notNull(), // 0=未選, 1=已選
  syncedToSheets: int("syncedToSheets").default(0).notNull(), // 0=未同步, 1=已同步
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedMaterial = typeof generatedMaterials.$inferSelect;
export type InsertGeneratedMaterial = typeof generatedMaterials.$inferInsert;
