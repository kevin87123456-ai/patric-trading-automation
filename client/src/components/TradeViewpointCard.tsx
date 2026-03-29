import React from 'react';

export interface TradeViewpointData {
  symbol: string; // BTC, ETH, SOL
  timeframe: string; // 15M, 1H, 4H, etc
  direction: 'long' | 'short' | 'neutral'; // 做多、做空、中性
  confidence: 'high' | 'medium' | 'low'; // 信心度
  
  // 柯基框數據
  corgiBoxHigh: number; // 柯基框上緣
  corgiBoxLow: number; // 柯基框下緣
  corgiBoxMiddle: number; // 0.5 關鍵位
  currentPrice: number; // 當前價格
  
  // 分析說明
  analysis: string; // 分析邏輯
  viewpoint: string; // 操作視角
  
  // 關鍵價格提醒
  keyLevels: Array<{
    price: number;
    label: string;
    note: string;
  }>;
  
  // 底部文案
  bottomText: string;
  timestamp?: number;
}

const TradeViewpointCard: React.FC<{ data: TradeViewpointData }> = ({ data }) => {
  const directionConfig = {
    long: { label: '看多', color: 'text-green-400', bgColor: 'bg-green-900/30', icon: '📈' },
    short: { label: '看空', color: 'text-red-400', bgColor: 'bg-red-900/30', icon: '📉' },
    neutral: { label: '中性', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30', icon: '➡️' },
  };

  const confidenceConfig = {
    high: { label: '高信心', color: 'border-green-500/50' },
    medium: { label: '中信心', color: 'border-yellow-500/50' },
    low: { label: '低信心', color: 'border-red-500/50' },
  };

  const config = directionConfig[data.direction];
  const confConfig = confidenceConfig[data.confidence];

  return (
    <div
      id="trade-viewpoint-card"
      className="w-full max-w-2xl mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 text-white shadow-2xl"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 頂部品牌區 */}
      <div className="flex items-center gap-2 mb-6 pb-6 border-b border-slate-700/50">
        <div className="text-cyan-400 text-xl">⚡</div>
        <span className="text-slate-400 text-sm font-medium">PATRIC 盤面觀點</span>
      </div>

      {/* 幣種區 */}
      <div className="mb-8">
        <div className="flex items-baseline gap-4 mb-4">
          <h1 className="text-5xl font-bold text-white">{data.symbol}</h1>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded-full text-sm text-slate-300">
              {data.timeframe}
            </span>
            <span className={`px-3 py-1 border rounded-full text-sm font-medium ${confConfig.color}`}>
              {confidenceConfig[data.confidence].label}
            </span>
          </div>
        </div>
      </div>

      {/* 方向判斷區 */}
      <div className="mb-8 p-4 rounded-xl bg-slate-700/30 border border-slate-600/50">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${config.bgColor}`}>
            {config.icon}
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">方向判斷</p>
            <p className={`text-3xl font-bold ${config.color}`}>{config.label}</p>
          </div>
        </div>
      </div>

      {/* 關鍵價位網格 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-700/20 border border-slate-600/50 rounded-lg p-4">
          <p className="text-slate-400 text-xs mb-2">柯基框上緣</p>
          <p className="text-2xl font-bold text-white">${data.corgiBoxHigh.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-700/20 border border-slate-600/50 rounded-lg p-4">
          <p className="text-slate-400 text-xs mb-2">柯基框下緣</p>
          <p className="text-2xl font-bold text-white">${data.corgiBoxLow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className={`border-2 rounded-lg p-4 ${config.bgColor} border-current`}>
          <p className="text-slate-300 text-xs mb-2">0.5 關鍵位</p>
          <p className="text-2xl font-bold text-white">${data.corgiBoxMiddle.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-700/20 border border-slate-600/50 rounded-lg p-4">
          <p className="text-slate-400 text-xs mb-2">當前價格</p>
          <p className="text-2xl font-bold text-white">${data.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* 分析說明 */}
      <div className="mb-8 p-4 bg-slate-700/20 border border-slate-600/50 rounded-lg">
        <p className="text-slate-300 text-sm leading-relaxed">{data.analysis}</p>
      </div>

      {/* 操作視角 */}
      <div className="mb-8 p-4 bg-slate-700/20 border border-slate-600/50 rounded-lg">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-cyan-400 mt-1">⊙</span>
          <p className="text-slate-400 text-sm font-medium">操作視角</p>
        </div>
        <p className="text-slate-200 text-sm leading-relaxed">{data.viewpoint}</p>
      </div>

      {/* 關鍵價格提醒 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-yellow-400">⚠️</span>
          <p className="text-slate-400 font-medium">關鍵價格提醒</p>
        </div>
        <div className="space-y-3">
          {data.keyLevels.map((level, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/20 border border-slate-600/50 rounded-lg">
              <div className="flex items-center gap-4 flex-1">
                <p className="text-white font-bold text-lg min-w-fit">
                  ${level.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-slate-400 text-sm">{level.label}</p>
              </div>
              <p className="text-slate-400 text-xs text-right max-w-xs">{level.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 底部文案 */}
      <div className="mb-6 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg text-center">
        <p className="text-slate-300 text-sm font-medium italic">{data.bottomText}</p>
      </div>

      {/* 頁尾 */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-700/50 text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">⚡</span>
          <span>Patric Live</span>
        </div>
        <span>@patric.trading</span>
      </div>
    </div>
  );
};

export default TradeViewpointCard;
