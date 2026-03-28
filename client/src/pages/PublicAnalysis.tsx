import { trpc } from "@/lib/trpc";
import ViewpointCard from "@/components/ViewpointCard";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Zap, Home } from "lucide-react";
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
        <p className="text-zinc-400">找不到此盤面分析</p>
        <Link href="/archive">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回分析紀錄
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
              所有分析
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-zinc-300">Patric Live</span>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm" className="h-8 px-2.5">
                <Home className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Card */}
      <div className="max-w-lg mx-auto px-4 py-6">
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
          <div className="mt-6 rounded-xl overflow-hidden border border-zinc-800">
            <img
              src={data.imageUrl}
              alt={`${data.coin} ${data.timeframe} 盤面`}
              className="w-full object-contain bg-zinc-900"
            />
          </div>
        )}
      </div>
    </div>
  );
}
