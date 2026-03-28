import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ViewpointCard from "@/components/ViewpointCard";
import {
  Upload,
  Loader2,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Send,
  ImageIcon,
  Sparkles,
  Eye,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";

type AnalysisResult = {
  coin: string;
  timeframe: string;
  corgiBoxHigh: number;
  corgiBoxLow: number;
  corgiBox05: number;
  currentPrice: number;
  direction: string;
  keyLevels: Array<{ price: number; type: string; description: string }>;
  analysis: string;
  confidence: string;
};

type ViewpointData = {
  operationView: string;
  priceAlerts: Array<{ price: number; label: string; action: string }>;
  summary: string;
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [coin, setCoin] = useState("BTC");
  const [timeframe, setTimeframe] = useState("4H");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [viewpointData, setViewpointData] = useState<ViewpointData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("analysis");

  const uploadMutation = trpc.analysis.upload.useMutation();
  const analyzeMutation = trpc.analysis.analyze.useMutation();
  const viewpointMutation = trpc.analysis.generateViewpoint.useMutation();
  const materialsMutation = trpc.analysis.generateMaterials.useMutation();
  const selectMutation = trpc.analysis.selectMaterial.useMutation();
  const syncMutation = trpc.analysis.syncToSheets.useMutation();
  const publishMutation = trpc.analysis.publish.useMutation();

  const publishStatusQuery = trpc.analysis.getPublishStatus.useQuery(
    { analysisId: currentAnalysisId! },
    { enabled: !!currentAnalysisId }
  );

  const isUploading = uploadMutation.isPending;
  const isAnalyzing = analyzeMutation.isPending;
  const isGeneratingViewpoint = viewpointMutation.isPending;
  const isGeneratingMaterials = materialsMutation.isPending;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => {
          const result = r.result as string;
          resolve(result.split(",")[1]);
        };
        r.readAsDataURL(file);
      });

      const analysis = await uploadMutation.mutateAsync({
        imageBase64: base64,
        coin: coin.toUpperCase(),
        timeframe,
        mimeType: file.type || "image/png",
      });

      setCurrentAnalysisId(analysis.id);
      setAnalysisResult(null);
      setViewpointData(null);

      toast.success("圖片上傳成功", { description: "開始分析盤面..." });

      const result = await analyzeMutation.mutateAsync({ analysisId: analysis.id });

      if (result?.analysisResult) {
        try {
          const parsed = JSON.parse(result.analysisResult);
          setAnalysisResult(parsed);
          setActiveTab("analysis");
          toast.success("分析完成", { description: `${parsed.coin} ${parsed.direction === "bullish" ? "偏多" : parsed.direction === "bearish" ? "偏空" : "觀望"}` });
        } catch {}
      }
    } catch (error: any) {
      toast.error("錯誤", { description: error.message });
    }
  }, [coin, timeframe]);

  const handleGenerateViewpoint = async () => {
    if (!currentAnalysisId) return;
    try {
      const data = await viewpointMutation.mutateAsync({ analysisId: currentAnalysisId });
      setViewpointData(data);
      setActiveTab("viewpoint");
      toast.success("觀點卡片已生成");
    } catch (error: any) {
      toast.error("生成失敗", { description: error.message });
    }
  };

  const handleGenerateMaterials = async () => {
    if (!currentAnalysisId) return;
    try {
      await materialsMutation.mutateAsync({ analysisId: currentAnalysisId });
      setActiveTab("materials");
      toast.success("素材已生成");
    } catch (error: any) {
      toast.error("生成失敗", { description: error.message });
    }
  };

  const handlePublish = async () => {
    if (!currentAnalysisId || !viewpointData) return;
    try {
      const result = await publishMutation.mutateAsync({
        analysisId: currentAnalysisId,
        operationView: viewpointData.operationView,
        priceAlerts: JSON.stringify(viewpointData.priceAlerts),
        coverTitle: analysisResult?.coin || "",
      });
      publishStatusQuery.refetch();
      const url = `${window.location.origin}/analysis/${result.slug}`;
      await navigator.clipboard.writeText(url);
      toast.success("已發佈並複製連結", { description: url });
    } catch (error: any) {
      toast.error("發佈失敗", { description: error.message });
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const materials = materialsMutation.data as any[];

  const coins = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX"];
  const timeframes = ["1M", "5M", "15M", "1H", "4H", "1D", "1W"];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Upload & Config */}
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-400" />
              上傳盤面截圖
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coin & Timeframe */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">幣種</label>
                <div className="flex flex-wrap gap-1.5">
                  {coins.slice(0, 4).map((c) => (
                    <Button
                      key={c}
                      variant={coin === c ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCoin(c)}
                      className="text-xs px-2.5 h-7"
                    >
                      {c}
                    </Button>
                  ))}
                  {!coins.slice(0, 4).includes(coin) ? (
                    <Input
                      value={coin}
                      onChange={(e) => setCoin(e.target.value.toUpperCase())}
                      className="h-7 w-16 text-xs bg-zinc-900/50 border-zinc-800 font-mono"
                      placeholder="其他"
                      autoFocus
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCoin("")}
                      className="text-xs px-2.5 h-7 text-zinc-500"
                    >
                      其他
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">週期</label>
                <div className="flex flex-wrap gap-1.5">
                  {timeframes.slice(3, 6).map((t) => (
                    <Button
                      key={t}
                      variant={timeframe === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeframe(t)}
                      className="text-xs px-2.5 h-7"
                    >
                      {t}
                    </Button>
                  ))}
                  {!timeframes.slice(3, 6).includes(timeframe) ? (
                    <Input
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value.toUpperCase())}
                      className="h-7 w-14 text-xs bg-zinc-900/50 border-zinc-800 font-mono"
                      placeholder="其他"
                      autoFocus
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimeframe("")}
                      className="text-xs px-2.5 h-7 text-zinc-500"
                    >
                      其他
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="space-y-2">
                  <ImageIcon className="h-8 w-8 text-zinc-600 mx-auto" />
                  <p className="text-sm text-zinc-400">點擊或拖放盤面截圖</p>
                  <p className="text-xs text-zinc-600">支援 PNG, JPG</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {(isUploading || isAnalyzing) && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isUploading ? "上傳中..." : "AI 分析中..."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Quick Actions */}
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleGenerateViewpoint}
              disabled={!currentAnalysisId || !analysisResult || isGeneratingViewpoint}
              className="w-full justify-start"
              variant="outline"
            >
              {isGeneratingViewpoint ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              生成觀點卡片（截圖發群）
            </Button>

            <Button
              onClick={handleGenerateMaterials}
              disabled={!currentAnalysisId || !analysisResult || isGeneratingMaterials}
              className="w-full justify-start"
              variant="outline"
            >
              {isGeneratingMaterials ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              生成直播素材（封面 + 標題 + 文案）
            </Button>

            <Button
              onClick={handlePublish}
              disabled={!viewpointData || publishMutation.isPending || publishStatusQuery.data?.published}
              className="w-full justify-start"
              variant="outline"
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              {publishStatusQuery.data?.published ? "已發佈至公開頁面" : "發佈至每日盤面（公開）"}
            </Button>

            {publishStatusQuery.data?.slug && (
              <div className="bg-zinc-800/40 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">公開連結</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-emerald-400 flex-1 truncate">
                    {window.location.origin}/analysis/{publishStatusQuery.data.slug}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/analysis/${publishStatusQuery.data?.slug}`,
                        "link"
                      )
                    }
                  >
                    {copiedField === "link" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )}

            <a href="https://www.canva.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full justify-start mt-2">
                <ExternalLink className="h-4 w-4 mr-2" />
                開啟 Canva 製作封面
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Results Tabs */}
      {(analysisResult || viewpointData || materials) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/50 border border-zinc-800">
            <TabsTrigger value="analysis">盤面分析</TabsTrigger>
            <TabsTrigger value="viewpoint" disabled={!viewpointData}>
              觀點卡片
            </TabsTrigger>
            <TabsTrigger value="materials" disabled={!materials}>
              直播素材
            </TabsTrigger>
          </TabsList>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="mt-4">
            {analysisResult && (
              <Card className="border-zinc-800 bg-zinc-900/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-bold text-white">
                      {analysisResult.coin} {analysisResult.timeframe}
                    </h3>
                    <Badge
                      className={
                        analysisResult.direction === "bullish"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : analysisResult.direction === "bearish"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }
                    >
                      {analysisResult.direction === "bullish" ? "看多" : analysisResult.direction === "bearish" ? "看空" : "觀望"}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-zinc-700">
                      {analysisResult.confidence === "high" ? "高信心" : analysisResult.confidence === "medium" ? "中信心" : "低信心"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-zinc-800/40 rounded-lg p-3">
                      <p className="text-[10px] text-zinc-500 uppercase">柯基框上緣</p>
                      <p className="font-mono font-bold text-sm text-white mt-1">${analysisResult.corgiBoxHigh.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-800/40 rounded-lg p-3">
                      <p className="text-[10px] text-zinc-500 uppercase">柯基框下緣</p>
                      <p className="font-mono font-bold text-sm text-white mt-1">${analysisResult.corgiBoxLow.toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-950/30 rounded-lg p-3 border border-emerald-800/30">
                      <p className="text-[10px] text-emerald-400 uppercase">0.5 關鍵位</p>
                      <p className="font-mono font-bold text-sm text-emerald-300 mt-1">${analysisResult.corgiBox05.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-800/40 rounded-lg p-3">
                      <p className="text-[10px] text-zinc-500 uppercase">當前價格</p>
                      <p className="font-mono font-bold text-sm text-white mt-1">${analysisResult.currentPrice.toLocaleString()}</p>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed">{analysisResult.analysis}</p>

                  {analysisResult.keyLevels?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">關鍵位階</p>
                      {analysisResult.keyLevels.map((kl, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-800/30 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-white">${kl.price.toLocaleString()}</span>
                            <Badge variant="outline" className="text-[10px] border-zinc-700">{kl.type}</Badge>
                          </div>
                          <span className="text-xs text-zinc-400">{kl.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Viewpoint Card Tab */}
          <TabsContent value="viewpoint" className="mt-4">
            {viewpointData && analysisResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">截圖此卡片即可分享給群友</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(
                        `${analysisResult.coin} ${analysisResult.timeframe} 觀點\n方向：${analysisResult.direction === "bullish" ? "看多" : analysisResult.direction === "bearish" ? "看空" : "觀望"}\n${viewpointData.operationView}\n\n${viewpointData.summary}`,
                        "viewpoint-text"
                      )
                    }
                  >
                    {copiedField === "viewpoint-text" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    複製文字版
                  </Button>
                </div>
                <ViewpointCard
                  coin={analysisResult.coin}
                  timeframe={analysisResult.timeframe}
                  direction={analysisResult.direction}
                  confidence={analysisResult.confidence}
                  corgiBoxHigh={analysisResult.corgiBoxHigh}
                  corgiBoxLow={analysisResult.corgiBoxLow}
                  corgiBox05={analysisResult.corgiBox05}
                  currentPrice={analysisResult.currentPrice}
                  analysisText={analysisResult.analysis}
                  operationView={viewpointData.operationView}
                  priceAlerts={viewpointData.priceAlerts}
                  summary={viewpointData.summary}
                />
              </div>
            )}
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="mt-4">
            {materials && materials.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {materials.map((m: any, i: number) => (
                  <Card
                    key={m.id}
                    className={`border-zinc-800 bg-zinc-900/30 transition-all ${
                      m.isSelected ? "ring-2 ring-emerald-500 border-emerald-500/50" : "hover:border-zinc-700"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">方案 {i + 1}</Badge>
                        {m.isSelected && <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">已選</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Cover Title */}
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">封面大標</p>
                        <div className="flex items-center justify-between bg-zinc-800/40 rounded-lg px-3 py-2">
                          <span className="text-lg font-black text-white">{m.coverTitle}</span>
                          <button onClick={() => copyToClipboard(m.coverTitle, `cover-${m.id}`)}>
                            {copiedField === `cover-${m.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-zinc-500" />}
                          </button>
                        </div>
                      </div>

                      {/* YouTube Title */}
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">YouTube 標題</p>
                        <div className="flex items-start justify-between bg-zinc-800/40 rounded-lg px-3 py-2 gap-2">
                          <span className="text-sm text-zinc-200">{m.youtubeTitle}</span>
                          <button onClick={() => copyToClipboard(m.youtubeTitle, `yt-${m.id}`)} className="shrink-0 mt-0.5">
                            {copiedField === `yt-${m.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-zinc-500" />}
                          </button>
                        </div>
                      </div>

                      {/* IG Story */}
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">IG 限動</p>
                        <div className="flex items-start justify-between bg-zinc-800/40 rounded-lg px-3 py-2 gap-2">
                          <span className="text-xs text-zinc-300 leading-relaxed">{m.igStory}</span>
                          <button onClick={() => copyToClipboard(m.igStory || "", `story-${m.id}`)} className="shrink-0 mt-0.5">
                            {copiedField === `story-${m.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-zinc-500" />}
                          </button>
                        </div>
                      </div>

                      {/* IG Post (collapsible) */}
                      <details className="group">
                        <summary className="text-[10px] text-zinc-500 uppercase cursor-pointer hover:text-zinc-400">
                          IG 貼文 ▸
                        </summary>
                        <div className="mt-2 bg-zinc-800/40 rounded-lg px-3 py-2 relative">
                          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{m.igPost}</p>
                          <button
                            onClick={() => copyToClipboard(m.igPost || "", `post-${m.id}`)}
                            className="absolute top-2 right-2"
                          >
                            {copiedField === `post-${m.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-zinc-500" />}
                          </button>
                        </div>
                      </details>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant={m.isSelected ? "default" : "outline"}
                          className="flex-1 text-xs"
                          onClick={() => selectMutation.mutate({ materialId: m.id }, {
                            onSuccess: () => {
                              materialsMutation.data?.forEach((item: any) => {
                                item.isSelected = item.id === m.id ? 1 : 0;
                              });
                              toast.success(`已選擇方案 ${i + 1}`);
                            }
                          })}
                        >
                          {m.isSelected ? "已選擇" : "選擇此方案"}
                        </Button>
                        {m.isSelected && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              if (!currentAnalysisId) return;
                              syncMutation.mutate({ analysisId: currentAnalysisId }, {
                                onSuccess: () => toast.success("已同步至 Google Sheets"),
                                onError: (e) => toast.error("同步失敗", { description: e.message }),
                              });
                            }}
                            disabled={syncMutation.isPending}
                          >
                            {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
