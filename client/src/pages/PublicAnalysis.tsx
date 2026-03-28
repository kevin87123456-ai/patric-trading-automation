import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ViewpointCard from "@/components/ViewpointCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Zap,
  TrendingUp,
  TrendingDown,
  Pencil,
  Save,
  X,
  Upload,
  ImageIcon,
  FileText,
} from "lucide-react";
import { useRoute, Link } from "wouter";
import { useState, useRef } from "react";

export default function PublicAnalysis() {
  const [, params] = useRoute("/analysis/:slug");
  const slug = params?.slug || "";
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = trpc.public.getAnalysis.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Owner check: only admin (Patric) can edit published analyses
  const isOwner = !!user && user.role === "admin";

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editOperationView, setEditOperationView] = useState("");
  const [editAnalysisText, setEditAnalysisText] = useState("");
  const [editSummary, setEditSummary] = useState("");

  // Image upload refs
  const profitInputRef = useRef<HTMLInputElement>(null);
  const lossInputRef = useRef<HTMLInputElement>(null);

  const editMutation = trpc.analysis.editPublished.useMutation({
    onSuccess: () => {
      toast.success("已更新");
      setEditing(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadImageMutation = trpc.analysis.uploadPublishedImage.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.imageType === "profit" ? "盈利" : "虧損"}截圖已上傳`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  function startEdit() {
    if (!data) return;
    setEditOperationView(data.operationView || "");
    setEditAnalysisText(data.analysisText || "");
    setEditSummary((data as any).summary || "");
    setEditing(true);
  }

  function saveEdit() {
    if (!data) return;
    editMutation.mutate({
      publishedId: data.id,
      operationView: editOperationView,
      analysisText: editAnalysisText,
      summary: editSummary,
    });
  }

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
          <div className="flex items-center gap-3">
            {isOwner && !editing && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-zinc-400" onClick={startEdit}>
                <Pencil className="h-3 w-3 mr-1" />
                編輯
              </Button>
            )}
            {isOwner && editing && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditing(false)}>
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={saveEdit}
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  儲存
                </Button>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-zinc-300">Patric</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Card */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {editing ? (
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">分析觀點</label>
                <Textarea
                  value={editAnalysisText}
                  onChange={(e) => setEditAnalysisText(e.target.value)}
                  className="min-h-[100px] bg-zinc-800/50 border-zinc-700 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">操作視角</label>
                <Textarea
                  value={editOperationView}
                  onChange={(e) => setEditOperationView(e.target.value)}
                  className="min-h-[80px] bg-zinc-800/50 border-zinc-700 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">一句話總結</label>
                <Textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="min-h-[50px] bg-zinc-800/50 border-zinc-700 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
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
        )}

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

        {/* Profit/Loss Images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Profit Image */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">盈利截圖</span>
            </div>
            {data.profitImage ? (
              <div className="rounded-xl overflow-hidden border border-emerald-500/20 relative group">
                <img src={data.profitImage} alt="盈利截圖" className="w-full object-contain bg-zinc-900" />
                {isOwner && (
                  <div
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => profitInputRef.current?.click()}
                  >
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ) : isOwner ? (
              <div
                className="rounded-xl border-2 border-dashed border-emerald-500/20 p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-500/40 transition-colors"
                onClick={() => profitInputRef.current?.click()}
              >
                <Upload className="h-5 w-5 text-emerald-500/50" />
                <span className="text-xs text-zinc-500">上傳盈利截圖</span>
              </div>
            ) : null}
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

          {/* Loss Image */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-xs font-medium text-red-400">虧損截圖</span>
            </div>
            {data.lossImage ? (
              <div className="rounded-xl overflow-hidden border border-red-500/20 relative group">
                <img src={data.lossImage} alt="虧損截圖" className="w-full object-contain bg-zinc-900" />
                {isOwner && (
                  <div
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => lossInputRef.current?.click()}
                  >
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ) : isOwner ? (
              <div
                className="rounded-xl border-2 border-dashed border-red-500/20 p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-red-500/40 transition-colors"
                onClick={() => lossInputRef.current?.click()}
              >
                <Upload className="h-5 w-5 text-red-500/50" />
                <span className="text-xs text-zinc-500">上傳虧損截圖</span>
              </div>
            ) : null}
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

        {/* Trade result badge */}
        {(data as any).tradeResult && (
          <div className="flex items-center gap-2">
            {(data as any).tradeResult === "profit" ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold px-3 py-1">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                盈利
              </Badge>
            ) : (
              <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs font-bold px-3 py-1">
                <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                虧損
              </Badge>
            )}
          </div>
        )}

        {/* Trade note (visible to everyone) */}
        {(data as any).tradeNote && (
          <Card className="border-zinc-800/50 bg-zinc-900/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">
                  {(data as any).tradeResult === "profit" ? "盈利原因" : (data as any).tradeResult === "loss" ? "虧損復盤" : "交易紀錄"}
                </span>
              </div>
              <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
                {(data as any).tradeNote}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
