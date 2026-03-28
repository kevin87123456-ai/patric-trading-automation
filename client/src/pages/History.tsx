import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ViewpointCard from "@/components/ViewpointCard";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Loader2,
  BarChart3,
  Copy,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`已複製${label}`);
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === "bullish") return <TrendingUp className="h-4 w-4 text-profit" />;
  if (direction === "bearish") return <TrendingDown className="h-4 w-4 text-loss" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "待分析", className: "bg-muted text-muted-foreground" },
    analyzing: { label: "分析中", className: "bg-warning/15 text-warning border-warning/30" },
    completed: { label: "已完成", className: "bg-profit/15 text-profit border-profit/30" },
    failed: { label: "失敗", className: "bg-loss/15 text-loss border-loss/30" },
  };
  const item = map[status] || map.pending;
  return <Badge className={item.className}>{item.label}</Badge>;
}

function AnalysisRow({ analysis }: { analysis: any }) {
  const [expanded, setExpanded] = useState(false);
  const [showViewpoint, setShowViewpoint] = useState(false);
  const materialsQuery = trpc.analysis.get.useQuery(
    { id: analysis.id },
    { enabled: expanded }
  );

  let parsedResult: any = null;
  try {
    if (analysis.analysisResult) {
      parsedResult = JSON.parse(analysis.analysisResult);
    }
  } catch {}

  const materials = materialsQuery.data?.materials || [];
  const selectedMaterial = materials.find((m: any) => m.isSelected === 1);

  // Check if this analysis has a published viewpoint
  const publishedQuery = trpc.analysis.getPublishStatus.useQuery(
    { analysisId: analysis.id },
    { enabled: expanded }
  );

  const hasViewpoint = publishedQuery.data?.published;
  let viewpointPriceAlerts: Array<{ price: number; label: string; action: string }> = [];
  try {
    if (publishedQuery.data?.priceAlerts) {
      viewpointPriceAlerts = JSON.parse(publishedQuery.data.priceAlerts);
    }
  } catch {}

  return (
    <Card className="border-border/50 transition-all hover:border-border">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            {parsedResult && <DirectionIcon direction={parsedResult.direction} />}
            <span className="font-bold font-mono text-sm">{analysis.coin}</span>
            <Badge variant="outline" className="text-xs font-mono">{analysis.timeframe}</Badge>
          </div>
          <StatusBadge status={analysis.status} />
          {selectedMaterial && (
            <span className="text-sm font-display font-bold truncate hidden md:block">
              {selectedMaterial.coverTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {new Date(analysis.createdAt).toLocaleDateString("zh-TW")}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          <Separator />

          {/* Analysis Result */}
          {parsedResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-muted/30 rounded-lg p-2 border border-border/30">
                  <p className="text-[10px] text-muted-foreground">柯基框上緣</p>
                  <p className="font-mono font-bold text-xs">${parsedResult.corgiBoxHigh?.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2 border border-border/30">
                  <p className="text-[10px] text-muted-foreground">柯基框下緣</p>
                  <p className="font-mono font-bold text-xs">${parsedResult.corgiBoxLow?.toLocaleString()}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-2 border border-primary/30">
                  <p className="text-[10px] text-primary">0.5 處</p>
                  <p className="font-mono font-bold text-xs text-primary">${parsedResult.corgiBox05?.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2 border border-border/30">
                  <p className="text-[10px] text-muted-foreground">當前價格</p>
                  <p className="font-mono font-bold text-xs">${parsedResult.currentPrice?.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{parsedResult.analysis}</p>
            </div>
          )}

          {/* Viewpoint Card Toggle */}
          {hasViewpoint && parsedResult && (
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewpoint(!showViewpoint);
                }}
              >
                {showViewpoint ? (
                  <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                )}
                {showViewpoint ? "收起觀點卡片" : "展開觀點卡片"}
              </Button>

              {showViewpoint && (
                <ViewpointCard
                  coin={parsedResult.coin || analysis.coin}
                  timeframe={parsedResult.timeframe || analysis.timeframe}
                  direction={publishedQuery.data?.direction || parsedResult.direction}
                  confidence={publishedQuery.data?.confidence || parsedResult.confidence}
                  corgiBoxHigh={publishedQuery.data?.corgiBoxHigh || parsedResult.corgiBoxHigh}
                  corgiBoxLow={publishedQuery.data?.corgiBoxLow || parsedResult.corgiBoxLow}
                  corgiBox05={publishedQuery.data?.corgiBox05 || parsedResult.corgiBox05}
                  currentPrice={publishedQuery.data?.currentPrice || parsedResult.currentPrice}
                  analysisText={publishedQuery.data?.analysisText || parsedResult.analysis}
                  operationView={publishedQuery.data?.operationView || ""}
                  priceAlerts={viewpointPriceAlerts}
                  summary={publishedQuery.data?.summary || ""}
                  publishedAt={publishedQuery.data?.publishedAt as unknown as string}
                />
              )}
            </div>
          )}

          {/* Materials */}
          {materialsQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 載入素材...
            </div>
          )}

          {materials.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">生成素材</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {materials.map((m: any, idx: number) => (
                  <div
                    key={m.id}
                    className={`rounded-lg p-3 border text-sm space-y-2 ${
                      m.isSelected === 1
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/30 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={m.isSelected === 1 ? "default" : "outline"} className="text-[10px]">
                        方案 {String.fromCharCode(65 + idx)}
                      </Badge>
                      {m.syncedToSheets === 1 && (
                        <Badge className="text-[10px] bg-profit/15 text-profit border-profit/30">已同步</Badge>
                      )}
                    </div>
                    <p className="font-bold font-display text-center text-base">{m.coverTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.youtubeTitle}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => copyToClipboard(m.coverTitle, "封面大標")}
                      >
                        <Copy className="h-2.5 w-2.5 mr-1" /> 大標
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => copyToClipboard(m.youtubeTitle, "YouTube 標題")}
                      >
                        <Copy className="h-2.5 w-2.5 mr-1" /> YT
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart Image */}
          {analysis.imageUrl && (
            <div className="rounded-lg overflow-hidden border border-border/30">
              <img
                src={analysis.imageUrl}
                alt={`${analysis.coin} ${analysis.timeframe} chart`}
                className="w-full max-h-[300px] object-contain bg-muted/20"
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function HistoryPage() {
  const analysesQuery = trpc.analysis.list.useQuery();
  const sheetsQuery = trpc.config.getSheetsUrl.useQuery();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">歷史記錄</h1>
          <p className="text-muted-foreground text-sm mt-1">
            查看過往盤面分析與直播素材，複盤最佳標題策略
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(sheetsQuery.data?.url, "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          開啟戰略庫
        </Button>
      </div>

      {/* Stats */}
      {analysesQuery.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">總分析次數</p>
              <p className="text-2xl font-bold font-mono mt-1">{analysesQuery.data.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">已完成</p>
              <p className="text-2xl font-bold font-mono mt-1 text-profit">
                {analysesQuery.data.filter((a: any) => a.status === "completed").length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">最常分析</p>
              <p className="text-2xl font-bold font-mono mt-1">
                {analysesQuery.data.length > 0
                  ? (() => {
                      const counts: Record<string, number> = {};
                      analysesQuery.data.forEach((a: any) => { counts[a.coin] = (counts[a.coin] || 0) + 1; });
                      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
                    })()
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">本月分析</p>
              <p className="text-2xl font-bold font-mono mt-1">
                {analysesQuery.data.filter((a: any) => {
                  const d = new Date(a.createdAt);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis List */}
      {analysesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : analysesQuery.data && analysesQuery.data.length > 0 ? (
        <div className="space-y-3">
          {analysesQuery.data.map((analysis: any) => (
            <AnalysisRow key={analysis.id} analysis={analysis} />
          ))}
        </div>
      ) : (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">尚無分析記錄</p>
            <p className="text-muted-foreground/60 text-xs mt-1">前往「素材生成」上傳你的第一張盤面截圖</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
