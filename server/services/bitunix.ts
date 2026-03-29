/**
 * Bitunix API 客戶端
 * 用於獲取 BTC、ETH、SOL 的 K 線數據
 */

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  symbol: string;
  timeframe: '1H' | '4H';
  klines: KlineData[];
  lastUpdate: number;
}

const BITUNIX_API_BASE = 'https://api.bitunix.com';
const SUPPORTED_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];

/**
 * 從 Bitunix 獲取 K 線數據
 * @param symbol 交易對 (e.g., 'BTC/USDT')
 * @param timeframe 時間框架 ('1H' 或 '4H')
 * @param limit 返回的蠟燭數量 (預設 100)
 */
export async function getKlines(
  symbol: string,
  timeframe: '1H' | '4H',
  limit: number = 100
): Promise<KlineData[]> {
  if (!SUPPORTED_PAIRS.includes(symbol)) {
    throw new Error(`Unsupported pair: ${symbol}`);
  }

  try {
    // 將時間框架轉換為 Bitunix 格式
    const interval = timeframe === '1H' ? '1h' : '4h';
    
    // 構建 API 請求 URL
    const url = new URL(`${BITUNIX_API_BASE}/v1/klines`);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('interval', interval);
    url.searchParams.append('limit', limit.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bitunix API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 轉換 Bitunix 格式為標準格式
    return data.data.map((kline: any) => ({
      time: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    }));
  } catch (error) {
    console.error(`Failed to fetch klines for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 獲取最新價格
 */
export async function getLatestPrice(symbol: string): Promise<number> {
  if (!SUPPORTED_PAIRS.includes(symbol)) {
    throw new Error(`Unsupported pair: ${symbol}`);
  }

  try {
    const url = new URL(`${BITUNIX_API_BASE}/v1/ticker`);
    url.searchParams.append('symbol', symbol);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Bitunix API error: ${response.status}`);
    }

    const data = await response.json();
    return parseFloat(data.data.last);
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 批量獲取多個交易對的 K 線數據
 */
export async function getMultipleKlines(
  symbols: string[],
  timeframe: '1H' | '4H',
  limit: number = 100
): Promise<Record<string, KlineData[]>> {
  const results: Record<string, KlineData[]> = {};

  for (const symbol of symbols) {
    try {
      results[symbol] = await getKlines(symbol, timeframe, limit);
    } catch (error) {
      console.error(`Failed to fetch ${symbol}:`, error);
      results[symbol] = [];
    }
  }

  return results;
}
