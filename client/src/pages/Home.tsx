import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Zap,
  Loader2,
  Check,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ImageIcon,
  Sparkles,
  Send,
  BarChart3,
} from "lucide-react";

type AnalysisResult = {
  coin: string;
  timeframe: string;
  corgiBoxHigh: number;
  corgiBoxLow: number;
  corgiBox05: number;
  currentPrice: number;
  direction: "bullish" | "bearish" | "neutral";
  keyLevels: Array<{ price: number; type: string; description: string }>;
  analysis: string;
  confidence: "high" | "medium" | "low";
};

type MaterialOption = {
  id: number;
  coverTitle: string;
  youtubeTitle: string;
  igPost: string | null;
  igStory: string | null;
  isSelected: number;
  syncedToSheets: number;
};

// Step indicator
function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isActive = currentStep >= step;
  const isCurrent = currentStep === step;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      >
        {isActive && currentStep > step ? <Check className="h-4 w-4" /> : step}
      </div>
      <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  if (direction === "bullish") {
    return (
      <Badge className="bg-profit/15 text-profit border-profit/30 hover:bg-profit/20">
        <TrendingUp className="h-3 w-3 mr-1" /> 看多
      </Badge>
    );
  }
  if (direction === "bearish") {
    return (
      <Badge className="bg-loss/15 text-loss border-loss/30 hover:bg-loss/20">
        <TrendingDown className="h-3 w-3 mr-1" /> 看空
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Minus className="h-3 w-3 mr-1" /> 觀望
    </Badge>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: "bg-profit/15 text-profit border-profit/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    low: "bg-loss/15 text-loss border-loss/30",
  };
  const labels: Record<string, string> = { high: "高信心", medium: "中信心", low: "低信心" };
  return <Badge className={colors[confidence] || ""}>{labels[confidence] || confidence}</Badge>;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`已複製${label}`);
}

export default function Home() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [coin, setCoin] = useState("BTC");
  const [timeframe, setTimeframe] = useState("4H");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/png");
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.analysis.upload.useMutation();
  const analyzeMutation = trpc.analysis.analyze.useMutation();
  const generateMutation = trpc.analysis.generateMaterials.useMutation();
  const selectMutation = trpc.analysis.selectMaterial.useMutation();
  const syncMutation = trpc.analysis.syncToSheets.useMutation();
  const canvaQuery = trpc.config.getCanvaUrl.useQuery();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("請上傳圖片檔案");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("圖片大小不得超過 10MB");
      return;
    }

    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      // Extract base64 part
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUploadAndAnalyze = useCallback(async () => {
    if (!imageBase64) {
      toast.error("請先上傳盤面截圖");
      return;
    }

    try {
      // Step 1: Upload
      toast.loading("上傳圖片中...", { id: "analyze" });
      const analysis = await uploadMutation.mutateAsync({
        imageBase64,
        coin,
        timeframe,
        mimeType: imageMimeType,
      });
      setAnalysisId(analysis.id);

      // Step 2: Analyze
      toast.loading("AI 分析盤面中（約 10-20 秒）...", { id: "analyze" });
      const result = await analyzeMutation.mutateAsync({ analysisId: analysis.id });

      if (result?.analysisResult) {
        try {
          const parsed = JSON.parse(result.analysisResult);
          setAnalysisResult(parsed);
          setCurrentStep(2);
          toast.success("盤面分析完成", { id: "analyze" });
        } catch {
          toast.error("分析結果解析失敗", { id: "analyze" });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "分析失敗", { id: "analyze" });
    }
  }, [imageBase64, coin, timeframe, imageMimeType, uploadMutation, analyzeMutation]);

  const handleGenerateMaterials = useCallback(async () => {
    if (!analysisId) return;
    try {
      toast.loading("生成直播素材中...", { id: "generate" });
      const result = await generateMutation.mutateAsync({ analysisId });
      setMaterials(result as MaterialOption[]);
      setCurrentStep(3);
      toast.success("3 組方案已生成", { id: "generate" });
    } catch (error: any) {
      toast.error(error.message || "素材生成失敗", { id: "generate" });
    }
  }, [analysisId, generateMutation]);

  const handleSelectMaterial = useCallback(async (materialId: number) => {
    try {
      await selectMutation.mutateAsync({ materialId });
      setSelectedMaterialId(materialId);
      setMaterials(prev => prev.map(m => ({ ...m, isSelected: m.id === materialId ? 1 : 0 })));
      toast.success("已選定方案");
    } catch (error: any) {
      toast.error(error.message || "選擇失敗");
    }
  }, [selectMutation]);

  const handleSyncToSheets = useCallback(async () => {
    if (!analysisId) return;
    try {
      toast.loading("同步至戰略庫...", { id: "sync" });
      await syncMutation.mutateAsync({ analysisId });
      setMaterials(prev => prev.map(m => m.isSelected === 1 ? { ...m, syncedToSheets: 1 } : m));
      setCurrentStep(4);
      toast.success("已同步至 Google Sheets 戰略庫", { id: "sync" });
    } catch (error: any) {
      toast.error(error.message || "同步失敗", { id: "sync" });
    }
  }, [analysisId, syncMutation]);

  const handleReset = useCallback(() => {
    setCurrentStep(1);
    setImagePreview(null);
    setImageBase64(null);
    setAnalysisId(null);
    setAnalysisResult(null);
    setMaterials([]);
    setSelectedMaterialId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const isLoading = uploadMutation.isPending || analyzeMutation.isPending || generateMutation.isPending;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">素材生成</h1>
          <p className="text-muted-foreground text-sm mt-1">
            上傳盤面截圖，一鍵產出直播封面與社群文案
          </p>
        </div>
        {currentStep > 1 && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            重新開始
          </Button>
        )}
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <StepIndicator step={1} currentStep={currentStep} label="上傳分析" />
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <StepIndicator step={2} currentStep={currentStep} label="生成素材" />
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <StepIndicator step={3} currentStep={currentStep} label="選擇方案" />
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <StepIndicator step={4} currentStep={currentStep} label="同步發布" />
      </div>

      {/* Step 1: Upload & Analyze */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-primary" />
            盤面上傳與分析
          </CardTitle>
          <CardDescription>上傳加密貨幣盤面截圖，AI 自動識別柯基框關鍵位階</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Coin Select */}
            <div className="space-y-2">
              <Label>幣種</Label>
              <Select value={coin} onValueChange={setCoin}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="BNB">BNB</SelectItem>
                  <SelectItem value="XRP">XRP</SelectItem>
                  <SelectItem value="DOGE">DOGE</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timeframe Select */}
            <div className="space-y-2">
              <Label>時間週期</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15M">15 分鐘</SelectItem>
                  <SelectItem value="1H">1 小時</SelectItem>
                  <SelectItem value="4H">4 小時</SelectItem>
                  <SelectItem value="1D">日線</SelectItem>
                  <SelectItem value="1W">週線</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <Label>盤面截圖</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative rounded-lg overflow-hidden border border-border/50 bg-muted/30">
              <img
                src={imagePreview}
                alt="盤面截圖"
                className="w-full max-h-[400px] object-contain"
              />
            </div>
          )}

          {/* Analyze Button */}
          <Button
            onClick={handleUploadAndAnalyze}
            disabled={!imageBase64 || isLoading}
            className="w-full md:w-auto"
            size="lg"
          >
            {uploadMutation.isPending || analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                AI 分析中...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                上傳並分析盤面
              </>
            )}
          </Button>

          {/* Analysis Result */}
          {analysisResult && (
            <div className="space-y-4 pt-2">
              <Separator />
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-bold text-lg font-display">分析結果</h3>
                <DirectionBadge direction={analysisResult.direction} />
                <ConfidenceBadge confidence={analysisResult.confidence} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                  <p className="text-xs text-muted-foreground">柯基框上緣</p>
                  <p className="font-mono font-bold text-sm mt-1">${analysisResult.corgiBoxHigh.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                  <p className="text-xs text-muted-foreground">柯基框下緣</p>
                  <p className="font-mono font-bold text-sm mt-1">${analysisResult.corgiBoxLow.toLocaleString()}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
                  <p className="text-xs text-primary">0.5 處（關鍵位）</p>
                  <p className="font-mono font-bold text-sm mt-1 text-primary">${analysisResult.corgiBox05.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                  <p className="text-xs text-muted-foreground">當前價格</p>
                  <p className="font-mono font-bold text-sm mt-1">${analysisResult.currentPrice.toLocaleString()}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{analysisResult.analysis}</p>

              {analysisResult.keyLevels.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">關鍵位階</p>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.keyLevels.map((level, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs">
                        ${level.price.toLocaleString()} - {level.description}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Generate Materials */}
      {currentStep >= 2 && (
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              直播素材生成
            </CardTitle>
            <CardDescription>根據盤面分析，自動產出 3 組封面大標與社群文案</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {materials.length === 0 ? (
              <Button
                onClick={handleGenerateMaterials}
                disabled={generateMutation.isPending}
                size="lg"
                className="w-full md:w-auto"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成素材中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    一鍵生成 3 組方案
                  </>
                )}
              </Button>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {materials.map((m, idx) => (
                  <MaterialCard
                    key={m.id}
                    material={m}
                    index={idx}
                    isSelected={m.isSelected === 1}
                    onSelect={() => handleSelectMaterial(m.id)}
                    isSelecting={selectMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3+4: Selected Material Actions */}
      {currentStep >= 3 && selectedMaterialId && (
        <SelectedMaterialActions
          material={materials.find(m => m.id === selectedMaterialId)!}
          canvaUrl={canvaQuery.data?.url || ""}
          onSyncToSheets={handleSyncToSheets}
          isSyncing={syncMutation.isPending}
          isSynced={materials.find(m => m.id === selectedMaterialId)?.syncedToSheets === 1}
        />
      )}
    </div>
  );
}

function MaterialCard({
  material,
  index,
  isSelected,
  onSelect,
  isSelecting,
}: {
  material: MaterialOption;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isSelecting: boolean;
}) {
  const labels = ["方案 A：時效型", "方案 B：教學型", "方案 C：情緒型"];
  return (
    <Card
      className={`transition-all cursor-pointer hover:border-primary/50 ${
        isSelected ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "border-border/50"
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
            {labels[index] || `方案 ${index + 1}`}
          </Badge>
          {isSelected && <Check className="h-4 w-4 text-primary" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cover Title */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">封面 8 字大標</p>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xl font-black font-display tracking-wider">{material.coverTitle}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); copyToClipboard(material.coverTitle, "封面大標"); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
          >
            <Copy className="h-3 w-3" /> 複製
          </button>
        </div>

        {/* YouTube Title */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">YouTube 標題</p>
          <p className="text-sm font-medium leading-snug">{material.youtubeTitle}</p>
          <button
            onClick={(e) => { e.stopPropagation(); copyToClipboard(material.youtubeTitle, "YouTube 標題"); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
          >
            <Copy className="h-3 w-3" /> 複製
          </button>
        </div>

        {/* IG Story */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">IG 限動</p>
          <p className="text-sm italic text-muted-foreground leading-snug">{material.igStory}</p>
          <button
            onClick={(e) => { e.stopPropagation(); copyToClipboard(material.igStory || "", "限動文案"); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
          >
            <Copy className="h-3 w-3" /> 複製
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function SelectedMaterialActions({
  material,
  canvaUrl,
  onSyncToSheets,
  isSyncing,
  isSynced,
}: {
  material: MaterialOption;
  canvaUrl: string;
  onSyncToSheets: () => void;
  isSyncing: boolean;
  isSynced: boolean;
}) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-primary" />
          已選方案：發布準備
        </CardTitle>
        <CardDescription>複製素材、跳轉 Canva 編輯封面、同步至戰略庫</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Cover Title */}
        <div className="bg-background rounded-xl p-6 text-center border border-border/50">
          <p className="text-xs text-muted-foreground mb-2">封面 8 字大標</p>
          <p className="text-3xl font-black font-display tracking-widest">{material.coverTitle}</p>
        </div>

        {/* IG Post Full */}
        <div className="bg-background rounded-lg p-4 border border-border/50">
          <p className="text-xs text-muted-foreground mb-2">IG 貼文文案</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{material.igPost}</p>
          <button
            onClick={() => copyToClipboard(material.igPost || "", "IG 貼文")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
          >
            <Copy className="h-3 w-3" /> 複製完整文案
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(canvaUrl, "_blank")}
            className="flex-1 min-w-[160px]"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            開啟 Canva 模板
          </Button>

          <Button
            onClick={onSyncToSheets}
            disabled={isSyncing || isSynced}
            className="flex-1 min-w-[160px]"
          >
            {isSynced ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                已同步戰略庫
              </>
            ) : isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                同步中...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                同步至戰略庫
              </>
            )}
          </Button>
        </div>

        {/* Quick Copy All */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(material.coverTitle, "封面大標")}
          >
            <Copy className="h-3 w-3 mr-1" /> 封面大標
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(material.youtubeTitle, "YouTube 標題")}
          >
            <Copy className="h-3 w-3 mr-1" /> YouTube 標題
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(material.igStory || "", "限動文案")}
          >
            <Copy className="h-3 w-3 mr-1" /> 限動文案
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(material.igPost || "", "IG 貼文")}
          >
            <Copy className="h-3 w-3 mr-1" /> IG 貼文
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
