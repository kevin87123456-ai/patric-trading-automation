import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Users,
  Eye,
  PlayCircle,
  ExternalLink,
  Search,
  RefreshCw,
  Video,
  Radio,
  TrendingUp,
  Info,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "patric_yt_channel_id";
const DEFAULT_CHANNEL_ID = "UCGnBVKPFRpRK_ky7JkDcBTA";

type FilterType = "videos_latest" | "streams_latest" | "shorts_latest";

function formatNumber(num: number | string | undefined): string {
  if (!num) return "0";
  const n = typeof num === "string" ? parseInt(num, 10) : num;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function parseSubscriberCount(text: string | undefined): number {
  if (!text) return 0;
  const cleaned = text.replace(/[,\s]/g, "").toLowerCase();
  const match = cleaned.match(/([\d.]+)([kmb]?)/);
  if (!match) return parseInt(cleaned, 10) || 0;
  const num = parseFloat(match[1]);
  const unit = match[2];
  if (unit === "k") return Math.round(num * 1000);
  if (unit === "m") return Math.round(num * 1000000);
  if (unit === "b") return Math.round(num * 1000000000);
  return Math.round(num);
}

export default function YouTube() {
  const [channelId, setChannelId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_CHANNEL_ID;
    }
    return DEFAULT_CHANNEL_ID;
  });
  const [inputId, setInputId] = useState(channelId);
  const [filter, setFilter] = useState<FilterType>("videos_latest");
  const [showHelp, setShowHelp] = useState(false);

  // Track subscriber count for "today's new followers"
  const [prevSubCount, setPrevSubCount] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`patric_yt_sub_${channelId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const today = new Date().toDateString();
        if (parsed.date === today) return parsed.count;
      }
    }
    return null;
  });

  const channelQuery = trpc.youtube.channelDetails.useQuery(
    { channelId },
    { enabled: !!channelId, retry: 1 }
  );

  const videosQuery = trpc.youtube.channelVideos.useQuery(
    { channelId, filter },
    { enabled: !!channelId, retry: 1 }
  );

  const channel = channelQuery.data as any;
  const videos = videosQuery.data as any;

  // Store subscriber count for daily tracking
  useEffect(() => {
    if (channel) {
      const currentCount = parseSubscriberCount(
        channel.subscriberCountText || String(channel.subscriberCount || 0)
      );
      const storageKey = `patric_yt_sub_${channelId}`;
      const today = new Date().toDateString();
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date !== today) {
          // New day - save yesterday's count as baseline
          setPrevSubCount(parsed.count);
          localStorage.setItem(storageKey, JSON.stringify({ date: today, count: currentCount, baseline: parsed.count }));
        } else if (!parsed.baseline && parsed.count) {
          setPrevSubCount(parsed.count);
        } else {
          setPrevSubCount(parsed.baseline || parsed.count);
        }
      } else {
        // First time - save current as baseline
        localStorage.setItem(storageKey, JSON.stringify({ date: today, count: currentCount, baseline: currentCount }));
        setPrevSubCount(currentCount);
      }
    }
  }, [channel, channelId]);

  const handleSearch = () => {
    if (inputId.trim()) {
      const id = inputId.trim();
      setChannelId(id);
      localStorage.setItem(STORAGE_KEY, id);
      toast.success("頻道 ID 已儲存");
    }
  };

  const currentSubCount = channel
    ? parseSubscriberCount(channel.subscriberCountText || String(channel.subscriberCount || 0))
    : 0;
  const todayNewFollowers = prevSubCount !== null && currentSubCount > 0
    ? currentSubCount - prevSubCount
    : null;

  const filterOptions: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: "videos_latest", label: "影片", icon: <Video className="h-3.5 w-3.5" /> },
    { value: "streams_latest", label: "直播", icon: <Radio className="h-3.5 w-3.5" /> },
    { value: "shorts_latest", label: "Shorts", icon: <PlayCircle className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Channel ID Input */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="輸入 YouTube 頻道 ID（以 UC 開頭）"
              className="bg-zinc-900/50 border-zinc-800 font-mono text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} variant="outline" className="shrink-0">
            <Search className="h-4 w-4 mr-2" />
            查詢並儲存
          </Button>
          <Button
            onClick={() => {
              channelQuery.refetch();
              videosQuery.refetch();
            }}
            variant="outline"
            size="icon"
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setShowHelp(!showHelp)}
            variant="ghost"
            size="icon"
            className="shrink-0 text-zinc-500"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {showHelp && (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-4 text-xs text-zinc-400 space-y-2">
              <p className="font-medium text-zinc-300">如何找到你的 YouTube 頻道 ID：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>打開你的 YouTube 頻道頁面</li>
                <li>點擊右上角頭像 → 「你的頻道」</li>
                <li>URL 中 <code className="text-emerald-400 bg-zinc-800 px-1 rounded">youtube.com/channel/UCxxxxxxx</code> 的 UC 開頭部分就是頻道 ID</li>
                <li>或到 YouTube Studio → 設定 → 頻道 → 基本資訊 → 頻道 ID</li>
              </ol>
              <p className="text-zinc-500">輸入後按「查詢並儲存」，下次進來會自動載入你的頻道。</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Channel Stats */}
      {channelQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : channelQuery.error ? (
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardContent className="p-6 text-center">
            <p className="text-zinc-400 text-sm">
              無法載入頻道數據，請確認頻道 ID 是否正確
            </p>
            <p className="text-zinc-600 text-xs mt-2">
              提示：頻道 ID 通常以 UC 開頭，可在 YouTube 頻道頁面的 URL 中找到
            </p>
          </CardContent>
        </Card>
      ) : channel ? (
        <>
          {/* Channel Header */}
          <Card className="border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {channel.avatar?.[0]?.url && (
                  <img
                    src={channel.avatar[0].url}
                    alt="Channel"
                    className="h-16 w-16 rounded-full border-2 border-zinc-700 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-white truncate">{channel.title}</h2>
                    {channel.badges?.some((b: any) => b.type === "VERIFIED_CHANNEL") && (
                      <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">已驗證</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                    {channel.description?.substring(0, 120)}
                  </p>
                  {channel.channelHandle && (
                    <a
                      href={`https://youtube.com/${channel.channelHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-400 hover:text-white transition-colors mt-1 inline-flex items-center gap-1"
                    >
                      {channel.channelHandle}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                  <Users className="h-4 w-4 text-zinc-500 mx-auto mb-1" />
                  <p className="text-lg font-bold font-mono text-white">
                    {formatNumber(channel.subscriberCountText || channel.subscriberCount)}
                  </p>
                  <p className="text-[10px] text-zinc-500">訂閱者</p>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                  <TrendingUp className="h-4 w-4 text-zinc-500 mx-auto mb-1" />
                  <p className={`text-lg font-bold font-mono ${
                    todayNewFollowers !== null && todayNewFollowers > 0
                      ? "text-emerald-400"
                      : todayNewFollowers !== null && todayNewFollowers < 0
                      ? "text-red-400"
                      : "text-white"
                  }`}>
                    {todayNewFollowers !== null
                      ? (todayNewFollowers >= 0 ? "+" : "") + todayNewFollowers.toLocaleString()
                      : "--"}
                  </p>
                  <p className="text-[10px] text-zinc-500">今日新增</p>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                  <Eye className="h-4 w-4 text-zinc-500 mx-auto mb-1" />
                  <p className="text-lg font-bold font-mono text-white">
                    {formatNumber(channel.viewCount)}
                  </p>
                  <p className="text-[10px] text-zinc-500">總觀看</p>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                  <PlayCircle className="h-4 w-4 text-zinc-500 mx-auto mb-1" />
                  <p className="text-lg font-bold font-mono text-white">
                    {formatNumber(channel.videosCount)}
                  </p>
                  <p className="text-[10px] text-zinc-500">影片數</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Videos Section */}
          <div>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {filterOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={filter === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(opt.value)}
                  className="shrink-0"
                >
                  {opt.icon}
                  <span className="ml-1.5">{opt.label}</span>
                </Button>
              ))}
            </div>

            {videosQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : videosQuery.error ? (
              <Card className="border-zinc-800 bg-zinc-900/30">
                <CardContent className="p-6 text-center">
                  <p className="text-zinc-400 text-sm">無法載入影片列表</p>
                  <p className="text-zinc-600 text-xs mt-1">{videosQuery.error.message}</p>
                </CardContent>
              </Card>
            ) : videos?.data && (videos.data as any[]).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(videos.data as any[]).map((video: any, i: number) => (
                  <a
                    key={i}
                    href={`https://youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Card className="border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group overflow-hidden h-full">
                      <div className="relative aspect-video bg-zinc-800">
                        {video.thumbnail?.[0]?.url ? (
                          <img
                            src={video.thumbnail[video.thumbnail.length - 1]?.url || video.thumbnail[0].url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlayCircle className="h-8 w-8 text-zinc-600" />
                          </div>
                        )}
                        {video.lengthText && (
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                            {video.lengthText}
                          </span>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="text-sm font-medium text-zinc-200 line-clamp-2 group-hover:text-white transition-colors leading-snug">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
                          {video.viewCount && (
                            <span>{formatNumber(video.viewCount)} 次觀看</span>
                          )}
                          {video.publishedTimeText && (
                            <span>{video.publishedTimeText}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            ) : (
              <Card className="border-zinc-800 bg-zinc-900/30">
                <CardContent className="p-8 text-center">
                  <Video className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">此類別暫無影片</p>
                  <p className="text-zinc-600 text-xs mt-1">試試切換其他分類</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
