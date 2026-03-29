import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Github, Settings as SettingsIcon, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";

export default function Settings() {
  const [, setLocation] = useLocation();
  const [isAuthorizingGitHub, setIsAuthorizingGitHub] = useState(false);
  const gitHubStatusQuery = trpc.github.getStatus.useQuery();
  const isAuthorized = gitHubStatusQuery.data?.isAuthorized || false;
  const gitHubUsername = gitHubStatusQuery.data?.username || null;

  const handleDownloadZip = () => {
    toast.info("正在打開 Management UI...");
    // 下載功能由 Manus 平台提供，程式中沒有實作，指引用戶到 Management UI
    toast.info("請在右上角 Management UI 的 More menu（⋯）選擇 'Download as ZIP'");
  };

  const handleGitHubAuthorize = () => {
    setIsAuthorizingGitHub(true);
    
    // 生成隨機 state 用於 OAuth 安全驗證
    const state = Math.random().toString(36).substring(7);
    
    // 構建 GitHub OAuth 授權 URL
    const clientId = "Ov23liHYphkHAVScTasg";
    const redirectUri = window.location.origin + "/api/github/callback";
    const scope = "repo,user";
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
    
    // 重定向到 GitHub 授權頁面
    window.location.href = authUrl;
  };

  const handleGitHubRevoke = async () => {
    toast.info("撤銷授權功能開發中...");
    // TODO: 實作撤銷授權 mutation
  };

  // 檢查 URL 參數確認授權結果
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubStatus = params.get("github");
    
    if (githubStatus === "success") {
      toast.success("GitHub 授權成功！");
      gitHubStatusQuery.refetch();
      // 清除 URL 參數
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (githubStatus === "error") {
      toast.error("GitHub 授權失敗，請重試");
      // 清除 URL 參數
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/dashboard")}
          className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            設定
          </h1>
          <p className="text-sm text-muted-foreground">管理網站設定和源代碼</p>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Download ZIP */}
        <Card className="border-border/50 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              下載源代碼
            </CardTitle>
            <CardDescription>下載完整的網站源代碼 (ZIP 格式)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              包含所有前端、後端、資料庫 schema 和配置文件。適合本地開發或自行部署。
            </p>
            <Button onClick={handleDownloadZip} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              下載 ZIP
            </Button>
          </CardContent>
        </Card>

        {/* GitHub Authorization */}
        <Card className="border-border/50 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub 授權
            </CardTitle>
            <CardDescription>連接你的 GitHub 帳號以支援後續延伸操作</CardDescription>
          </CardHeader>
          <CardContent>
            {isAuthorized ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <Check className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700">已授權</p>
                    <p className="text-xs text-green-600">GitHub 帳號: {gitHubUsername}</p>
                  </div>
                </div>
                <Button onClick={handleGitHubRevoke} variant="outline" className="w-full text-destructive">
                  撤銷授權
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-sm text-amber-700">未授權</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  授權你的 GitHub 帳號後，可以自動推送代碼、觸發 CI/CD、自動部署等操作。
                </p>
                <Button
                  onClick={handleGitHubAuthorize}
                  disabled={isAuthorizingGitHub}
                  className="w-full"
                >
                  <Github className="h-4 w-4 mr-2" />
                  {isAuthorizingGitHub ? "授權中..." : "授權 GitHub"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="border-border/50 bg-accent/20">
        <CardHeader>
          <CardTitle className="text-base">如何使用</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">📥 下載源代碼</p>
            <p>點擊「下載 ZIP」按鈕，或在右上角 Management UI 的 More menu（⋯）選擇「Download as ZIP」。</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">🔗 GitHub 授權</p>
            <p>
              點擊「授權 GitHub」按鈕，授權你的 GitHub 帳號。授權後可以支援自動推送代碼、觸發 CI/CD 流程、自動部署等後續延伸操作。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
