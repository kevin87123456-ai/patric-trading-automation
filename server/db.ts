import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, analyses, generatedMaterials, publishedAnalyses, siteSettings, type InsertAnalysis, type InsertGeneratedMaterial, type InsertPublishedAnalysis } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUser(openId: string, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return undefined;
  }

  await db.update(users).set(data).where(eq(users.openId, openId));
  return getUserByOpenId(openId);
}

// ===== Analysis CRUD =====

export async function createAnalysis(data: InsertAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(analyses).values(data);
  const insertId = result[0].insertId;
  const rows = await db.select().from(analyses).where(eq(analyses.id, insertId)).limit(1);
  return rows[0];
}

export async function getAnalysisById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateAnalysis(id: number, data: Partial<InsertAnalysis>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analyses).set(data).where(eq(analyses.id, id));
  return getAnalysisById(id);
}

export async function listAnalysesByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(analyses).where(eq(analyses.userId, userId)).orderBy(desc(analyses.createdAt)).limit(limit);
}

// ===== Generated Materials CRUD =====

export async function createMaterials(dataList: InsertGeneratedMaterial[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(generatedMaterials).values(dataList);
  if (dataList.length > 0) {
    return db.select().from(generatedMaterials).where(eq(generatedMaterials.analysisId, dataList[0].analysisId)).orderBy(desc(generatedMaterials.createdAt));
  }
  return [];
}

export async function getMaterialsByAnalysis(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(generatedMaterials).where(eq(generatedMaterials.analysisId, analysisId));
}

export async function selectMaterial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(generatedMaterials).where(eq(generatedMaterials.id, id)).limit(1);
  if (!rows[0]) throw new Error("Material not found");
  const analysisId = rows[0].analysisId;
  await db.update(generatedMaterials).set({ isSelected: 0 }).where(eq(generatedMaterials.analysisId, analysisId));
  await db.update(generatedMaterials).set({ isSelected: 1 }).where(eq(generatedMaterials.id, id));
  return db.select().from(generatedMaterials).where(eq(generatedMaterials.id, id)).limit(1).then(r => r[0]);
}

export async function markMaterialSynced(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(generatedMaterials).set({ syncedToSheets: 1 }).where(eq(generatedMaterials.id, id));
}

export async function getSelectedMaterialForAnalysis(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(generatedMaterials)
    .where(eq(generatedMaterials.analysisId, analysisId))
    .limit(50);
  return rows.find(r => r.isSelected === 1) ?? null;
}

// ===== Published Analyses CRUD =====

export async function createPublishedAnalysis(data: InsertPublishedAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(publishedAnalyses).values(data);
  const insertId = result[0].insertId;
  const rows = await db.select().from(publishedAnalyses).where(eq(publishedAnalyses.id, insertId)).limit(1);
  return rows[0];
}

export async function getPublishedBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(publishedAnalyses).where(eq(publishedAnalyses.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getPublishedByAnalysisId(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(publishedAnalyses).where(eq(publishedAnalyses.analysisId, analysisId)).limit(1);
  return rows[0] ?? null;
}

export async function listPublishedAnalyses(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(publishedAnalyses).orderBy(desc(publishedAnalyses.publishedAt)).limit(limit);
}

export async function updatePublishedAnalysis(id: number, data: Partial<InsertPublishedAnalysis>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(publishedAnalyses).set(data).where(eq(publishedAnalyses.id, id));
  const rows = await db.select().from(publishedAnalyses).where(eq(publishedAnalyses.id, id)).limit(1);
  return rows[0] ?? null;
}

// ===== Site Settings CRUD =====

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, key)).limit(1);
  return rows[0]?.settingValue ?? null;
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(siteSettings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.settingKey] = row.settingValue;
  }
  return result;
}

export async function upsertSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(siteSettings).values({ settingKey: key, settingValue: value })
    .onDuplicateKeyUpdate({ set: { settingValue: value } });
  return { key, value };
}
