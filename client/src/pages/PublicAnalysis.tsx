import { trpc } from "@/lib/trpc";
import ViewpointCard from "@/components/ViewpointCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ArrowLeft,
  Zap,
  Pencil,
  Check,
  X,
  Upload,
  TrendingUp,
  TrendingDown,
  ImageIcon,
} from "lucide-react";
import { useRoute, Link } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function PublicAnalysis() {
  const [, params] = useRoute("/analysis/:slug");
  const slug = params?.slug || "";

  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const isOwner = !!meQuery.data;

  const { data, isLoading, error, refetch } = trpc.public.getAnalysis.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    operationView: "",
    analysisText: "",
    summary: "",
    direction: "neutral" as "bullish" | "bearish" | "neutral",
  });

  const profitInputRef = useRef<HTMLInputElement>(null);
  const lossInputRef = useRef<HTMLInputElement>(null);

  const editMutation = trpc.analysis.editPublished.useMutation({
    onSuccess: () => {
      toast.success("已更新");
      setEditing(false);
      refetch();
    },
    onError: (err) => toast.error("更新失敗: " + err.message),
  });

  const uploadImageMutation = trpc.analysis.uploadPublishedImage.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.imageType === "profit" ? "營利" : "虧損"}圖已上傳`);
      refetch();
    },
    onError: (err) => toast.error("上傳失敗: " + err.message),
  });

  const handleStartEdit = () => {
    if (data) {
      setEditForm({
        operationView: data.operationView || "",
        analysisText: data.analysisText || "",
        summary: data.summary || "",
        direction: (data.direction as "bullish" | "bearish" | "neutral") || "neutral",
      });
      setEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (!data) return;
    editMutation.mutate({
      publishedId: data.id,
      operationView: editForm.operationView,
      analysisText: editForm.analysisText,
      summary: editForm.summary,
      direction: editForm.direction,
    });
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    imageType: "profit" | "loss"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadImageMutation.mutate({
        publishedId: data.id,
        imageBase64: base64,
        mimeType: file.type,
        imageType,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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

  const directionOptions: { value: "bullish" | "bearish" | "neutral"; label: string; color: string }[] = [
    { value: "bullish", label: "看多", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
    { value: "bearish", label: "看空", color: "text-red-400 border-red-500/30 bg-red-500/10" },
    { value: "neutral", label: "觀望", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
  ];

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
          <div className="flex items-center gap-2">
            {isOwner && !editing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit} className="text-xs h-8">
                <Pencil className="h-3 w-3 mr-1" />
                編輯
              </Button>
            )}
            {isOwner && editing && (
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="text-xs h-8">
                  <X className="h-3 w-3 mr-1" />
                  取消
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={editMutation.isPending} className="text-xs h-8">
                  {editMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
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
          <div className="space-y-4">
            {/* Direction edit */}
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">方向判斷</label>
              <div className="flex gap-2">
                {directionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEditForm({ ...editForm, direction: opt.value })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      editForm.direction === opt.value ? opt.color : "text-zinc-500 border-zinc-700 bg-zinc-800/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operation View edit */}
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">操作視角</label>
              <Textarea
                value={editForm.operationView}
                onChange={(e) => setEditForm({ ...editForm, operationView: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 min-h-[80px] text-sm"
              />
            </div>

            {/* Analysis Text edit */}
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">分析內容</label>
              <Textarea
                value={editForm.analysisText}
                onChange={(e) => setEditForm({ ...editForm, analysisText: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 min-h-[100px] text-sm"
              />
            </div>

            {/* Summary edit */}
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">一句話總結</label>
              <Textarea
                value={editForm.summary}
                onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 min-h-[60px] text-sm"
              />
            </div>
          </div>
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

        {/* Profit/Loss Images Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Profit Image */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">營利截圖</span>
            </div>
            {data.profitImage ? (
              <div className="relative rounded-xl overflow-hidden border border-emerald-500/20">
                <img src={data.profitImage} alt="營利截圖" className="w-full object-contain bg-zinc-900" />
                {isOwner && (
                  <button
                    onClick={() => profitInputRef.current?.click()}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-lg p-1.5 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
              </div>
            ) : isOwner ? (
              <button
                onClick={() => profitInputRef.current?.click()}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center justify-center gap-2 hover:border-emerald-500/40 transition-colors"
              >
                <ImageIcon className="h-6 w-6 text-emerald-500/40" />
                <span className="text-xs text-emerald-500/60">上傳營利截圖</span>
              </button>
            ) : null}
            <input
              ref={profitInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "profit")}
            />
          </div>

          {/* Loss Image */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-xs font-medium text-red-400">虧損截圖</span>
            </div>
            {data.lossImage ? (
              <div className="relative rounded-xl overflow-hidden border border-red-500/20">
                <img src={data.lossImage} alt="虧損截圖" className="w-full object-contain bg-zinc-900" />
                {isOwner && (
                  <button
                    onClick={() => lossInputRef.current?.click()}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-lg p-1.5 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
              </div>
            ) : isOwner ? (
              <button
                onClick={() => lossInputRef.current?.click()}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center gap-2 hover:border-red-500/40 transition-colors"
              >
                <ImageIcon className="h-6 w-6 text-red-500/40" />
                <span className="text-xs text-red-500/60">上傳虧損截圖</span>
              </button>
            ) : null}
            <input
              ref={lossInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "loss")}
            />
          </div>
        </div>

        {uploadImageMutation.isPending && (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            <span className="text-xs text-zinc-500">上傳中...</span>
          </div>
        )}
      </div>
    </div>
  );
}
