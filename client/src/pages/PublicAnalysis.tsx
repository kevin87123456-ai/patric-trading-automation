import { trpc } from "@/lib/trpc";
import ViewpointCard from "@/components/ViewpointCard";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useRoute, Link } from "wouter";

export default function PublicAnalysis() {
  const [, params] = useRoute("/analysis/:slug");
  const slug = params?.slug || "";

  const { data, isLoading, error } = trpc.public.getAnalysis.useQuery(
    { slug },
    { enabled: !!slug }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-zinc-400">找不到此觀點分析</p>
        <Link href="/archive">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回每日觀點
          </Button>
        </Link>
      </div>
    );
  }

  let priceAlerts: Array<{ price: number; label: string; action: string }> = [];
  try {
    priceAlerts = JSON.parse(data.priceAlerts || "[]");
  } catch {}

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top nav */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/archive">
            <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="h-4 w-4" />
              所有觀點
            </button>
          </Link>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-zinc-300">Patric</span>
          </div>
        </div>
      </nav>

      {/* Card */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <ViewpointCard
          coin={data.coin}
          timeframe={data.timeframe}
          direction={data.direction}
          confidence={data.confidence}
          corgiBoxHigh={data.corgiBoxHigh}
          corgiBoxLow={data.corgiBoxLow}
          corgiBox05={data.corgiBox05}
          currentPrice={data.currentPrice}
          analysisText={data.analysisText}
          operationView={data.operationView}
          priceAlerts={priceAlerts}
          publishedAt={data.publishedAt as unknown as string}
        />

        {/* Chart Image */}
        {data.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-zinc-800">
            <img
              src={data.imageUrl}
              alt={`${data.coin} ${data.timeframe} 盤面`}
              className="w-full object-contain bg-zinc-900"
            />
          </div>
        )}

        {/* Profit/Loss Images (read-only display) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Profit Image */}
          {data.profitImage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">營利截圖</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-emerald-500/20">
                <img src={data.profitImage} alt="營利截圖" className="w-full object-contain bg-zinc-900" />
              </div>
            </div>
          )}

          {/* Loss Image */}
          {data.lossImage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-400">虧損截圖</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-red-500/20">
                <img src={data.lossImage} alt="虧損截圖" className="w-full object-contain bg-zinc-900" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
