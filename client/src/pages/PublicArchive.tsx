import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Calendar,
  ChevronRight,
  Home,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === "bullish") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (direction === "bearish") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-yellow-400" />;
}

function DirectionLabel({ direction }: { direction: string }) {
  if (direction === "bullish") return <span className="text-emerald-400 text-xs font-medium">看多</span>;
  if (direction === "bearish") return <span className="text-red-400 text-xs font-medium">看空</span>;
  return <span className="text-yellow-400 text-xs font-medium">觀望</span>;
}

export default function PublicArchive() {
  const { data, isLoading } = trpc.public.listAnalyses.useQuery();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Patric 每日盤面</h1>
              <p className="text-[11px] text-zinc-500">加密貨幣柯基區間分析紀錄</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="shrink-0">
              <Home className="h-4 w-4 mr-1.5" />
              返回主頁
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : data && data.length > 0 ? (
          <div className="space-y-3">
            {data.map((item: any) => {
              let priceAlerts: any[] = [];
              try { priceAlerts = JSON.parse(item.priceAlerts || "[]"); } catch {}

              return (
                <Link key={item.id} href={`/analysis/${item.slug}`}>
                  <Card className="border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <DirectionIcon direction={item.direction} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold font-mono text-white text-sm">{item.coin}</span>
                              <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-400">
                                {item.timeframe}
                              </Badge>
                              <DirectionLabel direction={item.direction} />
                            </div>
                            <p className="text-xs text-zinc-500 mt-1 truncate max-w-[300px]">
                              {item.analysisText}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="font-mono text-xs text-zinc-300">
                              ${Number(item.currentPrice).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {new Date(item.publishedAt).toLocaleDateString("zh-TW", {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </div>
                      </div>

                      {/* Price alerts preview */}
                      {priceAlerts.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto">
                          {priceAlerts.slice(0, 3).map((alert: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 bg-zinc-800/40 rounded-lg px-2.5 py-1 shrink-0"
                            >
                              <span className="font-mono text-[11px] text-zinc-300">
                                ${alert.price?.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-zinc-500">{alert.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 text-sm">尚無公開分析紀錄</p>
            <p className="text-zinc-600 text-xs mt-1">Patric 發佈盤面分析後會出現在這裡</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/30 mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-emerald-500" />
            <span className="text-xs text-zinc-500">Patric Live</span>
          </div>
          <span className="text-[10px] text-zinc-600">柯基交易室</span>
        </div>
      </footer>
    </div>
  );
}
