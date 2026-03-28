import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { AIChatBox, type Message } from "@/components/AIChatBox";

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

  // Edit states
  const [editingAnalysis, setEditingAnalysis] = useState(false);
  const [editAnalysisData, setEditAnalysisData] = useState<Partial<AnalysisResult>>({});
  const [editingViewpoint, setEditingViewpoint] = useState(false);
  const [editViewpointData, setEditViewpointData] = useState<Partial<ViewpointData>>({});

  // AI Chat states
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [showChat, setShowChat] = useState(false);

  const uploadMutation = trpc.analysis.upload.useMutation();
  const analyzeMutation = trpc.analysis.analyze.useMutation();
  const viewpointMutation = trpc.analysis.generateViewpoint.useMutation();
  const materialsMutation = trpc.analysis.generateMaterials.useMutation();
  const selectMutation = trpc.analysis.selectMaterial.useMutation();
  const syncMutation = trpc.analysis.syncToSheets.useMutation();
  const publishMutation = trpc.analysis.publish.useMutation();
  const editAnalysisMutation = trpc.analysis.editAnalysis.useMutation();
  const aiChatMutation = trpc.analysis.aiChat.useMutation();

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
      setChatMessages([]);
      setShowChat(false);

      toast.success("圖片上傳成功", { description: "開始分析盤面..." });

      const result = await analyzeMutation.mutateAsync({ analysisId: analysis.id });

      if (result?.analysisResult) {
        try {
          const parsed = JSON.parse(result.analysisResult);
          setAnalysisResult(parsed);
          setActiveTab("analysis");
          toast.success("分析完成", { description: `${coin} ${parsed.direction === "bullish" ? "偏多" : parsed.direction === "bearish" ? "偏空" : "觀望"}` });
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
      const safeData: ViewpointData = {
        operationView: typeof data?.operationView === "string" ? data.operationView : "暫無操作建議",
        priceAlerts: Array.isArray(data?.priceAlerts)
          ? data.priceAlerts.filter(
              (a: any) => typeof a?.price === "number" && typeof a?.label === "string" && typeof a?.action === "string"
            )
          : [],
        summary: typeof data?.summary === "string" ? data.summary : "",
      };
      setViewpointData(safeData);
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
        summary: viewpointData.summary || "",
      });
      publishStatusQuery.refetch();
      const url = `${window.location.origin}/analysis/${result.slug}`;
      await navigator.clipboard.writeText(url);
      toast.success("已發佈並複製連結", { description: url });
    } catch (error: any) {
      toast.error("發佈失敗", { description: error.message });
    }
  };

  // Edit analysis handlers
  const startEditAnalysis = () => {
    if (!analysisResult) return;
    setEditAnalysisData({
      corgiBoxHigh: analysisResult.corgiBoxHigh,
      corgiBoxLow: analysisResult.corgiBoxLow,
      corgiBox05: analysisResult.corgiBox05,
      currentPrice: analysisResult.currentPrice,
      direction: analysisResult.direction,
      keyLevels: [...analysisResult.keyLevels],
    });
    setEditingAnalysis(true);
  };

  const saveEditAnalysis = async () => {
    if (!currentAnalysisId || !analysisResult) return;
    try {
      await editAnalysisMutation.mutateAsync({
        analysisId: currentAnalysisId,
        ...editAnalysisData,
        direction: editAnalysisData.direction as "bullish" | "bearish" | "neutral" | undefined,
        keyLevels: editAnalysisData.keyLevels as any,
      });
      setAnalysisResult({
        ...analysisResult,
        ...editAnalysisData,
        keyLevels: editAnalysisData.keyLevels || analysisResult.keyLevels,
      } as AnalysisResult);
      setEditingAnalysis(false);
      toast.success("分析已更新");
    } catch (error: any) {
      toast.error("更新失敗", { description: error.message });
    }
  };

  // Edit viewpoint handlers
  const startEditViewpoint = () => {
    if (!viewpointData || !analysisResult) return;
    setEditViewpointData({
      operationView: viewpointData.operationView,
      priceAlerts: [...viewpointData.priceAlerts],
      summary: viewpointData.summary,
    });
    setEditAnalysisData({
      direction: analysisResult.direction,
    });
    setEditingViewpoint(true);
  };

  const saveEditViewpoint = () => {
    if (!viewpointData || !analysisResult) return;
    setViewpointData({
      ...viewpointData,
      operationView: editViewpointData.operationView || viewpointData.operationView,
      priceAlerts: editViewpointData.priceAlerts || viewpointData.priceAlerts,
      summary: editViewpointData.summary || viewpointData.summary,
    });
    if (editAnalysisData.direction) {
      setAnalysisResult({
        ...analysisResult,
        direction: editAnalysisData.direction,
      });
    }
    setEditingViewpoint(false);
    toast.success("觀點卡片已更新");
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // AI Chat handler - uses functional setState to avoid stale closure issues
  const handleAIChatSend = useCallback((content: string) => {
    if (!currentAnalysisId) return;

    setChatMessages((prev) => {
      const newMessages: Message[] = [...prev, { role: "user", content }];

      aiChatMutation.mutate(
        { analysisId: currentAnalysisId, messages: newMessages },
        {
          onSuccess: (data) => {
            setChatMessages((p) => [
              ...p,
              { role: "assistant", content: data.response },
            ]);
            if (data.appliedChanges) {
              setAnalysisResult((prevResult) => {
                if (!prevResult) return prevResult;
                return { ...prevResult, ...data.appliedChanges };
              });
              toast.success("分析結果已更新", { description: "根據你的指示已修正" });
            }
          },
          onError: (error) => {
            setChatMessages((p) => [
              ...p,
              { role: "assistant", content: `錯誤：${error.message}` },
            ]);
          },
        }
      );

      return newMessages;
    });
  }, [currentAnalysisId]);

  const materials = materialsMutation.data as any[];

  const coins = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX"];
  const timeframes = ["1M", "5M", "15M", "1H", "4H", "1D", "1W"];

  const directionOptions = [
    { value: "bullish", label: "看多", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { value: "bearish", label: "看空", color: "bg-red-500/20 text-red-400 border-red-500/30" },
    { value: "neutral", label: "觀望", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  ];

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
                  {timeframes.map((t) => (
                    <Button
                      key={t}
                      variant={timeframe === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeframe(t)}
                      className="text-xs px-2 h-7"
                    >
                      {t}
                    </Button>
                  ))}
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

          {/* ===== Analysis Tab ===== */}
          <TabsContent value="analysis" className="mt-4">
            {analysisResult && (
              <Card className="border-zinc-800 bg-zinc-900/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">
                        {coin} {timeframe}
                      </h3>
                      {editingAnalysis ? (
                        <div className="flex gap-1.5">
                          {directionOptions.map((d) => (
                            <button
                              key={d.value}
                              onClick={() => setEditAnalysisData({ ...editAnalysisData, direction: d.value })}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                                editAnalysisData.direction === d.value
                                  ? d.color
                                  : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {editingAnalysis ? (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingAnalysis(false)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={saveEditAnalysis}
                            disabled={editAnalysisMutation.isPending}
                          >
                            {editAnalysisMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                            儲存
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs text-zinc-400" onClick={startEditAnalysis}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          編輯
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "柯基框上緣", key: "corgiBoxHigh" as const, accent: false },
                      { label: "柯基框下緣", key: "corgiBoxLow" as const, accent: false },
                      { label: "0.5 關鍵位", key: "corgiBox05" as const, accent: true },
                      { label: "當前價格", key: "currentPrice" as const, accent: false },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className={`rounded-lg p-3 ${
                          item.accent ? "bg-emerald-950/30 border border-emerald-800/30" : "bg-zinc-800/40"
                        }`}
                      >
                        <p className={`text-[10px] uppercase ${item.accent ? "text-emerald-400" : "text-zinc-500"}`}>
                          {item.label}
                        </p>
                        {editingAnalysis ? (
                          <Input
                            type="number"
                            value={editAnalysisData[item.key] ?? analysisResult[item.key]}
                            onChange={(e) =>
                              setEditAnalysisData({
                                ...editAnalysisData,
                                [item.key]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-7 mt-1 text-sm font-mono font-bold bg-zinc-900/50 border-zinc-700 text-white"
                          />
                        ) : (
                          <p className={`font-mono font-bold text-sm mt-1 ${item.accent ? "text-emerald-300" : "text-white"}`}>
                            ${(analysisResult[item.key] as number).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed">{analysisResult.analysis}</p>

                  {analysisResult.keyLevels?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">關鍵位階</p>
                      {(editingAnalysis ? editAnalysisData.keyLevels || [] : analysisResult.keyLevels).map((kl, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-800/30 rounded-lg px-3 py-2 gap-2">
                          {editingAnalysis ? (
                            <>
                              <Input
                                type="number"
                                value={kl.price}
                                onChange={(e) => {
                                  const newLevels = [...(editAnalysisData.keyLevels || [])];
                                  newLevels[i] = { ...newLevels[i], price: parseFloat(e.target.value) || 0 };
                                  setEditAnalysisData({ ...editAnalysisData, keyLevels: newLevels });
                                }}
                                className="h-7 w-28 text-xs font-mono bg-zinc-900/50 border-zinc-700"
                              />
                              <Input
                                value={kl.description}
                                onChange={(e) => {
                                  const newLevels = [...(editAnalysisData.keyLevels || [])];
                                  newLevels[i] = { ...newLevels[i], description: e.target.value };
                                  setEditAnalysisData({ ...editAnalysisData, keyLevels: newLevels });
                                }}
                                className="h-7 flex-1 text-xs bg-zinc-900/50 border-zinc-700"
                              />
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-white">${kl.price.toLocaleString()}</span>
                                <Badge variant="outline" className="text-[10px] border-zinc-700">{kl.type}</Badge>
                              </div>
                              <span className="text-xs text-zinc-400">{kl.description}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== Viewpoint Card Tab ===== */}
          <TabsContent value="viewpoint" className="mt-4">
            {viewpointData && analysisResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">截圖此卡片即可分享給群友</p>
                  <div className="flex gap-2">
                    {editingViewpoint ? (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingViewpoint(false)}>
                          <X className="h-3 w-3" />
                        </Button>
                        <Button size="sm" className="h-7 px-3 text-xs" onClick={saveEditViewpoint}>
                          <Save className="h-3 w-3 mr-1" />
                          儲存
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-zinc-400" onClick={startEditViewpoint}>
                          <Pencil className="h-3 w-3 mr-1" />
                          編輯
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() =>
                            copyToClipboard(
                              `${coin} ${timeframe} 觀點\n方向：${analysisResult.direction === "bullish" ? "看多" : analysisResult.direction === "bearish" ? "看空" : "觀望"}\n${viewpointData.operationView}\n\n${viewpointData.summary}`,
                              "viewpoint-text"
                            )
                          }
                        >
                          {copiedField === "viewpoint-text" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          複製文字版
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white"
                          onClick={async () => {
                            const el = document.getElementById("viewpoint-card");
                            if (!el) return;
                            toast.info("正在產生圖片...");
                            try {
                              const dataUrl = await toPng(el, {
                                backgroundColor: "#09090b",
                                pixelRatio: 3,
                                cacheBust: true,
                                skipFonts: true,
                                filter: (node: HTMLElement) => {
                                  // Skip cross-origin stylesheet links that cause CORS errors
                                  if (node.tagName === "LINK" && (node as HTMLLinkElement).rel === "stylesheet") {
                                    return false;
                                  }
                                  return true;
                                },
                              });
                              const link = document.createElement("a");
                              link.download = `${coin}-${timeframe}-觀點.png`;
                              link.href = dataUrl;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success("圖片已下載");
                            } catch (err) {
                              console.error("toPng error:", err);
                              toast.error("圖片產生失敗，請用截圖工具截取");
                            }
                          }}
                        >
                          <ImageIcon className="h-3 w-3 mr-1" />
                          下載圖片
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingViewpoint ? (
                  <Card className="border-zinc-800 bg-zinc-900/30">
                    <CardContent className="p-5 space-y-4">
                      {/* Direction edit */}
                      <div>
                        <label className="text-xs text-zinc-500 mb-2 block">方向判斷</label>
                        <div className="flex gap-2">
                          {directionOptions.map((d) => (
                            <button
                              key={d.value}
                              onClick={() => setEditAnalysisData({ ...editAnalysisData, direction: d.value })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                editAnalysisData.direction === d.value
                                  ? d.color
                                  : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Operation view edit */}
                      <div>
                        <label className="text-xs text-zinc-500 mb-2 block">操作視角</label>
                        <Textarea
                          value={editViewpointData.operationView || ""}
                          onChange={(e) => setEditViewpointData({ ...editViewpointData, operationView: e.target.value })}
                          className="bg-zinc-900/50 border-zinc-700 text-sm min-h-[100px]"
                        />
                      </div>

                      {/* Price alerts edit */}
                      <div>
                        <label className="text-xs text-zinc-500 mb-2 block">關鍵價格提醒</label>
                        <div className="space-y-2">
                          {(editViewpointData.priceAlerts || []).map((alert, i) => (
                            <div key={i} className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                value={alert.price}
                                onChange={(e) => {
                                  const newAlerts = [...(editViewpointData.priceAlerts || [])];
                                  newAlerts[i] = { ...newAlerts[i], price: parseFloat(e.target.value) || 0 };
                                  setEditViewpointData({ ...editViewpointData, priceAlerts: newAlerts });
                                }}
                                className="h-8 text-xs font-mono bg-zinc-900/50 border-zinc-700"
                                placeholder="價格"
                              />
                              <Input
                                value={alert.label}
                                onChange={(e) => {
                                  const newAlerts = [...(editViewpointData.priceAlerts || [])];
                                  newAlerts[i] = { ...newAlerts[i], label: e.target.value };
                                  setEditViewpointData({ ...editViewpointData, priceAlerts: newAlerts });
                                }}
                                className="h-8 text-xs bg-zinc-900/50 border-zinc-700"
                                placeholder="標籤"
                              />
                              <Input
                                value={alert.action}
                                onChange={(e) => {
                                  const newAlerts = [...(editViewpointData.priceAlerts || [])];
                                  newAlerts[i] = { ...newAlerts[i], action: e.target.value };
                                  setEditViewpointData({ ...editViewpointData, priceAlerts: newAlerts });
                                }}
                                className="h-8 text-xs bg-zinc-900/50 border-zinc-700"
                                placeholder="建議動作"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary edit */}
                      <div>
                        <label className="text-xs text-zinc-500 mb-2 block">一句話總結</label>
                        <Input
                          value={editViewpointData.summary || ""}
                          onChange={(e) => setEditViewpointData({ ...editViewpointData, summary: e.target.value })}
                          className="bg-zinc-900/50 border-zinc-700 text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <ViewpointCard
                    coin={coin}
                    timeframe={timeframe}
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
                )}
              </div>
            )}
          </TabsContent>

          {/* ===== Materials Tab ===== */}
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

      {/* AI Correction Chat */}
      {analysisResult && currentAnalysisId && (
        <div className="mt-6">
          {!showChat ? (
            <Button
              variant="outline"
              onClick={() => setShowChat(true)}
              className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
            >
              <Sparkles className="h-4 w-4 mr-2 text-emerald-400" />
              開啟 AI 對話 — 校正分析結果
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-medium text-white">AI 觀點校正</h3>
                  <span className="text-[10px] text-zinc-500">如分析結果有誤，直接告訴 AI 調整</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-zinc-500 hover:text-white"
                  onClick={() => setShowChat(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <AIChatBox
                messages={chatMessages}
                onSendMessage={handleAIChatSend}
                isLoading={aiChatMutation.isPending}
                placeholder="例如：這張圖應該看空、信心度調高、柯基框上緣改成 95000..."
                height="400px"
                emptyStateMessage="告訴我哪裡分析不對，我幫你修正"
                suggestedPrompts={[
                  "這張圖應該看空",
                  "信心度調高",
                  "方向改成觀望",
                  "重新分析一次",
                ]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
