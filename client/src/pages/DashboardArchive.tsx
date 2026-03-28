import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Eye,
  Save,
  ArrowLeft,
  Upload,
  ImageIcon,
  FileText,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";

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

function TradeResultBadge({ result }: { result: string | null }) {
  if (result === "profit") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-2">
        盈利
      </Badge>
    );
  }
  if (result === "loss") {
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] font-bold px-2">
        虧損
      </Badge>
    );
  }
  return null;
}

// Detail view for a single published analysis
function AnalysisDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const { data, isLoading, error, refetch } = trpc.public.getAnalysis.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const [tradeNote, setTradeNote] = useState("");
  const [noteInitialized, setNoteInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  // Image upload
  const profitInputRef = useRef<HTMLInputElement>(null);
  const lossInputRef = useRef<HTMLInputElement>(null);

  const uploadImageMutation = trpc.analysis.uploadPublishedImage.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.imageType === "profit" ? "盈利" : "虧損"}截圖已上傳`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateTradeNoteMutation = trpc.analysis.updateTradeNote.useMutation({
    onSuccess: () => {
      toast.success("交易紀錄已儲存");
      setSaving(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setSaving(false);
    },
  });

  // Initialize note from data via useEffect to avoid render-phase setState
  useEffect(() => {
    if (data && !noteInitialized) {
      setTradeNote((data as any).tradeNote || "");
      setNoteInitialized(true);
    }
  }, [data, noteInitialized]);

  function handleImageUpload(file: File, imageType: "profit" | "loss") {
    if (!data) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("圖片大小不能超過 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadImageMutation.mutate({
        publishedId: data.id,
        imageBase64: base64,
        mimeType: file.type || "image/png",
        imageType,
      });
    };
    reader.readAsDataURL(file);
  }

  function saveTradeNote() {
    if (!data) return;
    setSaving(true);
    const tradeResult = (data as any).tradeResult || ((data as any).profitImage ? "profit" : (data as any).lossImage ? "loss" : undefined);
    updateTradeNoteMutation.mutate({
      publishedId: data.id,
      tradeNote,
      tradeResult,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-zinc-400 text-sm">載入失敗</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Button>
      </div>
    );
  }

  const tradeResult = (data as any).tradeResult as string | null;
  const isProfit = tradeResult === "profit";
  const isLoss = tradeResult === "loss";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-zinc-400 hover:text-white" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          返回
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-bold font-mono text-white">{data.coin}</span>
          <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-400">
            {data.timeframe}
          </Badge>
          <DirectionLabel direction={data.direction} />
          <TradeResultBadge result={tradeResult} />
        </div>
      </div>

      {/* Chart image */}
      {data.imageUrl && (
        <div className="rounded-xl overflow-hidden border border-zinc-800">
          <img src={data.imageUrl} alt={`${data.coin} 盤面`} className="w-full object-contain bg-zinc-900" />
        </div>
      )}

      {/* Profit/Loss image upload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Profit */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">盈利截圖</span>
          </div>
          {(data as any).profitImage ? (
            <div className="rounded-xl overflow-hidden border border-emerald-500/20 relative group">
              <img src={(data as any).profitImage} alt="盈利截圖" className="w-full object-contain bg-zinc-900" />
              <div
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => profitInputRef.current?.click()}
              >
                <Upload className="h-5 w-5 text-white" />
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border-2 border-dashed border-emerald-500/20 p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-500/40 transition-colors"
              onClick={() => profitInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 text-emerald-500/50" />
              <span className="text-xs text-zinc-500">上傳盈利截圖</span>
            </div>
          )}
          <input
            ref={profitInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file, "profit");
              e.target.value = "";
            }}
          />
        </div>

        {/* Loss */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className="text-xs font-medium text-red-400">虧損截圖</span>
          </div>
          {(data as any).lossImage ? (
            <div className="rounded-xl overflow-hidden border border-red-500/20 relative group">
              <img src={(data as any).lossImage} alt="虧損截圖" className="w-full object-contain bg-zinc-900" />
              <div
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => lossInputRef.current?.click()}
              >
                <Upload className="h-5 w-5 text-white" />
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border-2 border-dashed border-red-500/20 p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-red-500/40 transition-colors"
              onClick={() => lossInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 text-red-500/50" />
              <span className="text-xs text-zinc-500">上傳虧損截圖</span>
            </div>
          )}
          <input
            ref={lossInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file, "loss");
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {uploadImageMutation.isPending && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          <span className="text-xs text-zinc-500">正在上傳圖片...</span>
        </div>
      )}

      {/* Trade note section */}
      <Card className="border-zinc-800/50 bg-zinc-900/30">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">
              {isProfit ? "盈利原因" : isLoss ? "虧損復盤" : "交易紀錄"}
            </span>
            {tradeResult && <TradeResultBadge result={tradeResult} />}
          </div>
          <Textarea
            value={tradeNote}
            onChange={(e) => setTradeNote(e.target.value)}
            placeholder={
              isProfit
                ? "記錄這筆交易為什麼盈利，做對了什麼..."
                : isLoss
                ? "復盤這筆交易，哪裡出了問題，下次如何改進..."
                : "上傳盈利或虧損截圖後，在這裡記錄原因或復盤..."
            }
            className="min-h-[120px] bg-zinc-800/50 border-zinc-700 text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={saveTradeNote}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              儲存紀錄
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardArchive() {
  const { data, isLoading, error } = trpc.public.listAnalyses.useQuery();
  const [, setLocation] = useLocation();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // If viewing detail
  if (selectedSlug) {
    return <AnalysisDetail slug={selectedSlug} onBack={() => setSelectedSlug(null)} />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-zinc-400 hover:text-white"
            onClick={() => setLocation("/dashboard")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">每日觀點</h1>
            <p className="text-sm text-zinc-500 mt-1">已發佈的盤面分析一覽</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 border-zinc-700 text-zinc-400 hover:text-white"
          onClick={() => window.open("/archive", "_blank")}
        >
          <Eye className="h-3.5 w-3.5" />
          查看公開頁面
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-900/20 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-zinc-400 text-sm">載入失敗</p>
          <p className="text-zinc-600 text-xs mt-1">{error.message}</p>
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((item: any) => {
            let priceAlerts: any[] = [];
            try { priceAlerts = JSON.parse(item.priceAlerts || "[]"); } catch {}

            const tradeResult = item.tradeResult as string | null;

            return (
              <div key={item.id} onClick={() => setSelectedSlug(item.slug)} className="cursor-pointer">
                <Card className="border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group">
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
                            <TradeResultBadge result={tradeResult} />
                          </div>
                          <p className="text-xs text-zinc-500 mt-1 truncate max-w-[400px]">
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400 text-sm">尚無已發佈的觀點分析</p>
          <p className="text-zinc-600 text-xs mt-1">在「素材生成」頁面完成分析後即可發佈</p>
        </div>
      )}
    </div>
  );
}
