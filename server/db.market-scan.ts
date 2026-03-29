/**
 * 市場掃描相關的資料庫操作
 */

import { getDb } from './db';
import { marketScans, marketScanKeyLevels, scanJobLogs, type MarketScan, type InsertMarketScan, type MarketScanKeyLevel, type InsertMarketScanKeyLevel, type ScanJobLog, type InsertScanJobLog } from '../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * 建立市場掃描記錄
 */
export async function createMarketScan(
  data: Omit<InsertMarketScan, 'id' | 'createdAt' | 'updatedAt'> & {
    keyLevels?: Array<Omit<InsertMarketScanKeyLevel, 'id' | 'scanId' | 'createdAt'>>;
  }
): Promise<MarketScan | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const scanId = nanoid();
  const now = new Date();

  try {
    // 插入掃描記錄
    await db.insert(marketScans).values({
      id: scanId,
      ...data,
      createdAt: now,
      updatedAt: now,
    } as InsertMarketScan);

    // 插入關鍵價格提醒
    if (data.keyLevels && data.keyLevels.length > 0) {
      await db.insert(marketScanKeyLevels).values(
        data.keyLevels.map((level) => ({
          id: nanoid(),
          scanId,
          ...level,
          createdAt: now,
        }))
      );
    }

    // 返回建立的掃描記錄
    const scan = await db.query.marketScans.findFirst({
      where: eq(marketScans.id, scanId),
    });

    return scan || null;
  } catch (error) {
    console.error('[MarketScan] Failed to create market scan:', error);
    throw error;
  }
}

/**
 * 獲取最新的市場掃描記錄
 */
export async function getLatestMarketScans(
  symbol: string,
  timeframe: string,
  limit: number = 10
): Promise<MarketScan[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.query.marketScans.findMany({
      where: and(eq(marketScans.symbol, symbol), eq(marketScans.timeframe, timeframe)),
      orderBy: desc(marketScans.createdAt),
      limit,
    });
  } catch (error) {
    console.error('[MarketScan] Failed to get latest market scans:', error);
    return [];
  }
}

/**
 * 獲取市場掃描記錄及其關鍵價格
 */
export async function getMarketScanWithKeyLevels(scanId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const scan = await db.query.marketScans.findFirst({
      where: eq(marketScans.id, scanId),
    });

    if (!scan) return null;

    const keyLevels = await db.query.marketScanKeyLevels.findMany({
      where: eq(marketScanKeyLevels.scanId, scanId),
    });

    return { ...scan, keyLevels };
  } catch (error) {
    console.error('[MarketScan] Failed to get market scan with key levels:', error);
    return null;
  }
}

/**
 * 發佈市場掃描記錄
 */
export async function publishMarketScan(scanId: string, imageUrl?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const now = Date.now();
    await db.update(marketScans).set({
      published: true,
      publishedAt: now,
      imageUrl,
      updatedAt: new Date(),
    }).where(eq(marketScans.id, scanId));
  } catch (error) {
    console.error('[MarketScan] Failed to publish market scan:', error);
    throw error;
  }
}

/**
 * 獲取已發佈的市場掃描記錄
 */
export async function getPublishedMarketScans(limit: number = 50): Promise<MarketScan[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.query.marketScans.findMany({
      where: eq(marketScans.published, true),
      orderBy: desc(marketScans.createdAt),
      limit,
    });
  } catch (error) {
    console.error('[MarketScan] Failed to get published market scans:', error);
    return [];
  }
}

/**
 * 建立掃描任務日誌
 */
export async function createScanJobLog(
  data: Omit<InsertScanJobLog, 'id' | 'createdAt'>
): Promise<ScanJobLog | null> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const jobId = nanoid();

  try {
    await db.insert(scanJobLogs).values({
      id: jobId,
      ...data,
      createdAt: new Date(),
    } as InsertScanJobLog);

    const log = await db.query.scanJobLogs.findFirst({
      where: eq(scanJobLogs.id, jobId),
    });

    return log || null;
  } catch (error) {
    console.error('[ScanJobLog] Failed to create scan job log:', error);
    throw error;
  }
}

/**
 * 更新掃描任務日誌
 */
export async function updateScanJobLog(
  jobId: string,
  data: Partial<Omit<ScanJobLog, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.update(scanJobLogs).set(data as any).where(eq(scanJobLogs.id, jobId));
  } catch (error) {
    console.error('[ScanJobLog] Failed to update scan job log:', error);
    throw error;
  }
}

/**
 * 獲取最近的掃描任務日誌
 */
export async function getRecentScanJobLogs(jobType: string, limit: number = 10): Promise<ScanJobLog[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.query.scanJobLogs.findMany({
      where: eq(scanJobLogs.jobType, jobType),
      orderBy: desc(scanJobLogs.scheduledAt),
      limit,
    });
  } catch (error) {
    console.error('[ScanJobLog] Failed to get recent scan job logs:', error);
    return [];
  }
}

/**
 * 獲取上一次的掃描結果（用於比較方向變化）
 */
export async function getPreviousScan(symbol: string, timeframe: string): Promise<MarketScan | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    return await db.query.marketScans.findFirst({
      where: and(eq(marketScans.symbol, symbol), eq(marketScans.timeframe, timeframe)),
      orderBy: desc(marketScans.createdAt),
    });
  } catch (error) {
    console.error('[MarketScan] Failed to get previous scan:', error);
    return null;
  }
}
