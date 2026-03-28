import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
  Zap,
} from "lucide-react";

type PriceAlert = {
  price: number;
  label: string;
  action: string;
};

type ViewpointCardProps = {
  coin: string;
  timeframe: string;
  direction: string;
  confidence: string;
  corgiBoxHigh: string | number;
  corgiBoxLow: string | number;
  corgiBox05: string | number;
  currentPrice: string | number;
  analysisText: string;
  operationView: string;
  priceAlerts: PriceAlert[];
  publishedAt?: string;
  summary?: string;
};

function DirectionDisplay({ direction }: { direction: string }) {
  if (direction === "bullish") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400">方向判斷</p>
          <p className="font-bold text-emerald-400">看多</p>
        </div>
      </div>
    );
  }
  if (direction === "bearish") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
          <TrendingDown className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400">方向判斷</p>
          <p className="font-bold text-red-400">看空</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
        <Minus className="h-5 w-5 text-yellow-400" />
      </div>
      <div>
        <p className="text-xs text-zinc-400">方向判斷</p>
        <p className="font-bold text-yellow-400">觀望</p>
      </div>
    </div>
  );
}

export default function ViewpointCard({
  coin,
  timeframe,
  direction,
  confidence,
  corgiBoxHigh,
  corgiBoxLow,
  corgiBox05,
  currentPrice,
  analysisText,
  operationView,
  priceAlerts,
  publishedAt,
  summary,
}: ViewpointCardProps) {
  const confidenceColors: Record<string, string> = {
    high: "text-emerald-400",
    medium: "text-yellow-400",
    low: "text-red-400",
  };
  const confidenceLabels: Record<string, string> = {
    high: "高信心",
    medium: "中信心",
    low: "低信心",
  };

  const directionBg =
    direction === "bullish"
      ? "from-emerald-950/40 to-zinc-950"
      : direction === "bearish"
      ? "from-red-950/40 to-zinc-950"
      : "from-yellow-950/40 to-zinc-950";

  const accentColor =
    direction === "bullish"
      ? "emerald"
      : direction === "bearish"
      ? "red"
      : "yellow";

  return (
    <div
      id="viewpoint-card"
      className={`bg-gradient-to-br ${directionBg} rounded-2xl border border-zinc-800 overflow-hidden w-full max-w-lg mx-auto`}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-zinc-400 tracking-wider uppercase">
              Patric 盤面觀點
            </span>
          </div>
          {publishedAt && (
            <span className="text-xs text-zinc-500">
              {new Date(publishedAt).toLocaleDateString("zh-TW", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-black tracking-tight text-white">
            {coin}
          </h2>
          <Badge
            variant="outline"
            className="text-xs font-mono border-zinc-700 text-zinc-300"
          >
            {timeframe}
          </Badge>
          <Badge
            className={`text-xs ${confidenceColors[confidence] || "text-zinc-400"} bg-transparent border border-zinc-700`}
          >
            {confidenceLabels[confidence] || confidence}
          </Badge>
        </div>

        <DirectionDisplay direction={direction} />
      </div>

      {/* Price Grid */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/50">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">柯基框上緣</p>
            <p className="font-mono font-bold text-sm text-white mt-1">
              ${Number(corgiBoxHigh).toLocaleString()}
            </p>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/50">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">柯基框下緣</p>
            <p className="font-mono font-bold text-sm text-white mt-1">
              ${Number(corgiBoxLow).toLocaleString()}
            </p>
          </div>
          <div className={`bg-${accentColor}-950/30 rounded-xl p-3 border border-${accentColor}-800/30`}>
            <p className={`text-[10px] text-${accentColor}-400 uppercase tracking-wider`}>0.5 關鍵位</p>
            <p className={`font-mono font-bold text-sm text-${accentColor}-300 mt-1`}>
              ${Number(corgiBox05).toLocaleString()}
            </p>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/50">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">當前價格</p>
            <p className="font-mono font-bold text-sm text-white mt-1">
              ${Number(currentPrice).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Analysis */}
      <div className="px-5 pb-3">
        <p className="text-sm text-zinc-300 leading-relaxed">{analysisText}</p>
      </div>

      {/* Operation View */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-zinc-400" />
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">操作視角</p>
        </div>
        <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/50">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{operationView}</p>
        </div>
      </div>

      {/* Price Alerts */}
      {priceAlerts.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-zinc-400" />
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">關鍵價格提醒</p>
          </div>
          <div className="space-y-2">
            {priceAlerts.map((alert, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-zinc-900/40 rounded-lg px-4 py-2.5 border border-zinc-800/50"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-white">
                    ${alert.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-zinc-400">{alert.label}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-zinc-700 text-zinc-300"
                >
                  {alert.action}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {summary && (
        <div className="px-5 py-4 border-t border-zinc-800/50 bg-zinc-950/50">
          <p className="text-sm font-medium text-zinc-300 italic text-center">
            「{summary}」
          </p>
        </div>
      )}

      {/* Watermark */}
      <div className="px-5 py-3 flex items-center justify-between border-t border-zinc-800/30">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] text-zinc-500 font-medium">Patric Live</span>
        </div>
        <span className="text-[10px] text-zinc-600">@patric_trade</span>
      </div>
    </div>
  );
}
