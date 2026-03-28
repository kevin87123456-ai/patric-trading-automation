import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Zap,
  Youtube,
  Instagram,
  MessageCircle,
  FileText,
  Pencil,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function AboutPage() {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const isOwner = !!meQuery.data;

  const { data, isLoading, error, refetch } = trpc.public.getAboutData.useQuery();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    intro: "",
    whatIDo: "",
    philosophy: "",
    youtube: "",
    ig: "",
    whatsapp: "",
    freeDoc: "",
    freeDocTitle: "",
  });

  const updateMutation = trpc.settings.updateMultiple.useMutation({
    onSuccess: () => {
      toast.success("已儲存");
      setEditing(false);
      refetch();
    },
    onError: (err) => {
      toast.error("儲存失敗: " + err.message);
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        intro: data.intro || "",
        whatIDo: data.whatIDo || "",
        philosophy: data.philosophy || "",
        youtube: data.youtube || "",
        ig: data.ig || "",
        whatsapp: data.whatsapp || "",
        freeDoc: data.freeDoc || "",
        freeDocTitle: data.freeDocTitle || "",
      });
    }
  }, [data]);

  const handleSave = () => {
    updateMutation.mutate({
      settings: [
        { key: "about_intro", value: form.intro },
        { key: "about_what_i_do", value: form.whatIDo },
        { key: "about_philosophy", value: form.philosophy },
        { key: "about_youtube", value: form.youtube },
        { key: "about_ig", value: form.ig },
        { key: "about_whatsapp", value: form.whatsapp },
        { key: "about_free_doc", value: form.freeDoc },
        { key: "about_free_doc_title", value: form.freeDocTitle },
      ],
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">認識 Patric</h1>
              <p className="text-[11px] text-zinc-500">柯基交易室</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/archive">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-xs">
                每日觀點
              </Button>
            </Link>
            {isOwner && !editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="text-xs"
              >
                <Pencil className="h-3 w-3 mr-1" />
                編輯
              </Button>
            )}
            {isOwner && editing && (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    if (data) {
                      setForm({
                        intro: data.intro || "",
                        whatIDo: data.whatIDo || "",
                        philosophy: data.philosophy || "",
                        youtube: data.youtube || "",
                        ig: data.ig || "",
                        whatsapp: data.whatsapp || "",
                        freeDoc: data.freeDoc || "",
                        freeDocTitle: data.freeDocTitle || "",
                      });
                    }
                  }}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="text-xs"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  儲存
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <span className="text-3xl font-bold text-emerald-400">P</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Patric</h2>
            <p className="text-sm text-zinc-400 mt-1">柯基交易室 Corgi Trading Room</p>
          </div>
        </div>

        {/* Intro */}
        <Card className="border-zinc-800/50 bg-zinc-900/30">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              關於我
            </h3>
            {editing ? (
              <Textarea
                value={form.intro}
                onChange={(e) => setForm({ ...form, intro: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 min-h-[160px] text-sm text-zinc-200"
                placeholder="自我介紹..."
              />
            ) : (
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {data?.intro || "尚未填寫"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* What I Do */}
        <Card className="border-zinc-800/50 bg-zinc-900/30">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3">我在做什麼</h3>
            {editing ? (
              <Textarea
                value={form.whatIDo}
                onChange={(e) => setForm({ ...form, whatIDo: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 min-h-[120px] text-sm text-zinc-200"
                placeholder="你在做的事..."
              />
            ) : (
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {data?.whatIDo || "尚未填寫"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Philosophy */}
        <Card className="border-zinc-800/50 bg-zinc-900/30">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3">交易哲學</h3>
            {editing ? (
              <Textarea
                value={form.philosophy}
                onChange={(e) => setForm({ ...form, philosophy: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 min-h-[120px] text-sm text-zinc-200"
                placeholder="你的交易哲學..."
              />
            ) : (
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {data?.philosophy || "尚未填寫"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Free Document */}
        {(editing || data?.freeDoc) && (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                免費資源
              </h3>
              {editing ? (
                <div className="space-y-3">
                  <Input
                    value={form.freeDocTitle}
                    onChange={(e) => setForm({ ...form, freeDocTitle: e.target.value })}
                    className="bg-zinc-800/50 border-zinc-700 text-sm"
                    placeholder="資源標題"
                  />
                  <Input
                    value={form.freeDoc}
                    onChange={(e) => setForm({ ...form, freeDoc: e.target.value })}
                    className="bg-zinc-800/50 border-zinc-700 text-sm font-mono"
                    placeholder="資源連結 URL"
                  />
                </div>
              ) : (
                <a
                  href={data?.freeDoc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <FileText className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                      {data?.freeDocTitle || "免費講義"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">點擊查看完整內容</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-600 ml-auto group-hover:text-emerald-400 transition-colors" />
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Links */}
        <Card className="border-zinc-800/50 bg-zinc-900/30">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-emerald-400 mb-4">聯絡方式</h3>
            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Youtube className="h-4 w-4 text-red-400 shrink-0" />
                  <Input
                    value={form.youtube}
                    onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                    className="bg-zinc-800/50 border-zinc-700 text-sm font-mono"
                    placeholder="YouTube 頻道連結"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Instagram className="h-4 w-4 text-pink-400 shrink-0" />
                  <Input
                    value={form.ig}
                    onChange={(e) => setForm({ ...form, ig: e.target.value })}
                    className="bg-zinc-800/50 border-zinc-700 text-sm font-mono"
                    placeholder="IG 帳號（不含 @）"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-green-400 shrink-0" />
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className="bg-zinc-800/50 border-zinc-700 text-sm font-mono"
                    placeholder="WhatsApp 社群連結"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.youtube && (
                  <a
                    href={data.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <Youtube className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">YouTube</p>
                      <p className="text-xs text-zinc-500 truncate">Patric_柯基交易室</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-zinc-600 ml-auto shrink-0" />
                  </a>
                )}
                {data?.ig && (
                  <a
                    href={`https://instagram.com/${data.ig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
                      <Instagram className="h-5 w-5 text-pink-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">Instagram</p>
                      <p className="text-xs text-zinc-500 truncate">@{data.ig}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-zinc-600 ml-auto shrink-0" />
                  </a>
                )}
                {data?.whatsapp && (
                  <a
                    href={data.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">WhatsApp 社群</p>
                      <p className="text-xs text-zinc-500 truncate">加入私人社群</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-zinc-600 ml-auto shrink-0" />
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/30 mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
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
