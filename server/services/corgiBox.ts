/**
 * 柯基框計算邏輯
 * 基於次高、次低、0.5 中線的交易系統
 */

import { KlineData } from './bitunix';

export interface CorgiBoxData {
  high: number; // 柯基框上緣（次高）
  low: number; // 柯基框下緣（次低）
  middle: number; // 0.5 中線
  currentPrice: number;
  direction: 'long' | 'short' | 'neutral';
  confidence: 'high' | 'medium' | 'low';
  analysis: string;
  keyLevels: Array<{
    price: number;
    label: string;
    note: string;
  }>;
}

/**
 * 計算次高和次低
 * 找出最近 N 根蠟燭中的第二高和第二低
 */
function findSecondHighLow(klines: KlineData[]): { secondHigh: number; secondLow: number } {
  if (klines.length < 2) {
    throw new Error('Need at least 2 klines to calculate second high/low');
  }

  const highs = klines.map(k => k.high).sort((a, b) => b - a);
  const lows = klines.map(k => k.low).sort((a, b) => a - b);

  return {
    secondHigh: highs[1],
    secondLow: lows[1],
  };
}

/**
 * 判斷撐壓轉變
 * 檢查價格是否突破了關鍵位置
 */
function detectSupportResistanceChange(
  klines: KlineData[],
  corgiBoxHigh: number,
  corgiBoxLow: number,
  corgiBoxMiddle: number
): { direction: 'long' | 'short' | 'neutral'; confidence: 'high' | 'medium' | 'low' } {
  if (klines.length === 0) {
    return { direction: 'neutral', confidence: 'low' };
  }

  const lastKline = klines[klines.length - 1];
  const closePrice = lastKline.close;
  const highPrice = lastKline.high;
  const lowPrice = lastKline.low;

  // 檢查是否突破 0.5 中線
  const breakAboveMiddle = closePrice > corgiBoxMiddle && lowPrice <= corgiBoxMiddle;
  const breakBelowMiddle = closePrice < corgiBoxMiddle && highPrice >= corgiBoxMiddle;

  // 檢查是否突破上下緣
  const breakAboveHigh = closePrice > corgiBoxHigh;
  const breakBelowLow = closePrice < corgiBoxLow;

  // 做多信號：突破 0.5 中線向上，且收盤遠離區間
  if (breakAboveMiddle && closePrice > corgiBoxMiddle * 1.001) {
    return {
      direction: 'long',
      confidence: breakAboveHigh ? 'high' : 'medium',
    };
  }

  // 做空信號：無法突破阻力，收盤低於中線
  if (breakBelowMiddle && closePrice < corgiBoxMiddle * 0.999) {
    return {
      direction: 'short',
      confidence: breakBelowLow ? 'high' : 'medium',
    };
  }

  // 中性：在區間內波動
  if (closePrice > corgiBoxLow && closePrice < corgiBoxHigh) {
    return {
      direction: 'neutral',
      confidence: 'medium',
    };
  }

  return { direction: 'neutral', confidence: 'low' };
}

/**
 * 計算柯基框數據
 */
export function calculateCorgiBox(klines: KlineData[]): CorgiBoxData {
  if (klines.length === 0) {
    throw new Error('No kline data provided');
  }

  // 計算次高和次低
  const { secondHigh, secondLow } = findSecondHighLow(klines);
  const middle = (secondHigh + secondLow) / 2;

  // 獲取當前價格
  const currentPrice = klines[klines.length - 1].close;

  // 判斷方向
  const { direction, confidence } = detectSupportResistanceChange(
    klines,
    secondHigh,
    secondLow,
    middle
  );

  // 生成分析文案
  const analysis = generateAnalysis(direction, currentPrice, secondHigh, secondLow, middle);

  // 生成關鍵價格提醒
  const keyLevels = generateKeyLevels(secondHigh, secondLow, middle, currentPrice, direction);

  return {
    high: secondHigh,
    low: secondLow,
    middle,
    currentPrice,
    direction,
    confidence,
    analysis,
    keyLevels,
  };
}

/**
 * 生成分析文案
 */
function generateAnalysis(
  direction: 'long' | 'short' | 'neutral',
  currentPrice: number,
  high: number,
  low: number,
  middle: number
): string {
  if (direction === 'long') {
    return `價格已突破柯基框 0.5 處並站穩，目前在月線級別壓力位附近震盪。若能有效突破月線壓力，有望測試柯基框上緣。若跌破 0.5 處，則需觀察下方支撐。`;
  } else if (direction === 'short') {
    return `價格已跌破柯基框 0.5 處，並在 0.5 下方運行，顯示空頭趨勢。若無法站穩 0.5 上方，則可能繼續下探柯基框下緣。建議觀察 0.5 處的反彈情況，若受阻可考慮做空。`;
  } else {
    return `價格在柯基框區間內波動，暫無明確方向。需要等待撐壓轉變的信號，才能確定下一步操作方向。`;
  }
}

/**
 * 生成關鍵價格提醒
 */
function generateKeyLevels(
  high: number,
  low: number,
  middle: number,
  currentPrice: number,
  direction: 'long' | 'short' | 'neutral'
): Array<{ price: number; label: string; note: string }> {
  const levels: Array<{ price: number; label: string; note: string }> = [];

  // 上緣
  levels.push({
    price: high,
    label: '柯基框上緣',
    note: direction === 'long' ? '強阻力，站穩力量強' : '觀察突破情況',
  });

  // 0.5 中線
  levels.push({
    price: middle,
    label: '柯基框 0.5',
    note: direction === 'long' ? '目前壓力，觀察反彈' : '目前支撐，觀察做空注意是否突破',
  });

  // 下緣
  levels.push({
    price: low,
    label: '柯基框下緣',
    note: direction === 'short' ? '強支撐，跌破注意止損' : '觀察支撐情況',
  });

  return levels.sort((a, b) => b.price - a.price);
}

/**
 * 比較兩個觀點，判斷是否需要變換方向
 */
export function compareViewpoints(
  previousDirection: 'long' | 'short' | 'neutral',
  currentDirection: 'long' | 'short' | 'neutral',
  previousStopLoss: number,
  currentPrice: number
): {
  shouldChange: boolean;
  reason: string;
} {
  // 如果方向相同，不需要變換
  if (previousDirection === currentDirection) {
    return {
      shouldChange: false,
      reason: '方向未改變',
    };
  }

  // 檢查是否觸及止損位
  if (previousDirection === 'long' && currentPrice <= previousStopLoss) {
    return {
      shouldChange: true,
      reason: `已觸及止損位 $${previousStopLoss}，需要變換方向`,
    };
  }

  if (previousDirection === 'short' && currentPrice >= previousStopLoss) {
    return {
      shouldChange: true,
      reason: `已觸及止損位 $${previousStopLoss}，需要變換方向`,
    };
  }

  // 未觸及止損位，但方向改變
  return {
    shouldChange: true,
    reason: `方向已改變，從 ${previousDirection} 改為 ${currentDirection}`,
  };
}
