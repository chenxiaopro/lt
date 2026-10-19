import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchFirstMvs, fetchMvDetail, fetchMvUrl, fetchPersonalizedMv } from "../api/client";
import type { MvItem } from "../api/types";
import { MvTile } from "../components/MediaCard";
import { Line, Rect } from "../components/Skeleton";
import { formatCount } from "../utils/format";

export default function MvPage() {
  const { id } = useParams();
  if (id) return <MvPlayer id={id} />;
  return <MvList />;
}

function MvList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MvItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchPersonalizedMv(), fetchFirstMvs(18)])
      .then(([a, b]) => {
        const map = new Map<number, MvItem>();
        [...a, ...b].forEach((item) => {
          if (item.id) map.set(item.id, item);
        });
        setItems([...map.values()]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center bg-[#09090B]/90 px-2 pb-2 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl">
        <button type="button" aria-label="返回" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">MV</h1>
      </header>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 px-4 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Rect className="aspect-video" />
              <Line className="mt-2 w-4/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pt-2">
          {items.map((item) => (
            <MvTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MvPlayer({ id }: { id: string }) {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [detail, setDetail] = useState<{
    name?: string;
    artistName?: string;
    artistId?: number;
    playCount?: number;
    desc?: string;
    artists?: Array<{ id: number; name: string }>;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchMvDetail(id), fetchMvUrl(id)])
      .then(([info, src]) => {
        if (!alive) return;
        setDetail(info ?? null);
        setUrl(src);
      })
      .catch(() => {
        if (alive) setUrl("");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const artistName = detail?.artistName || detail?.artists?.map((a) => a.name).join(" / ") || "";
  const artistId = detail?.artistId || detail?.artists?.[0]?.id;

  return (
    <div>
      <header className="flex items-center px-2 pt-[max(10px,env(safe-area-inset-top))]">
        <button type="button" aria-label="返回" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="truncate pr-4 text-lg font-semibold">{detail?.name || "MV"}</h1>
      </header>
      <div className="bg-black">
        {url ? (
          <video src={url} controls autoPlay playsInline className="aspect-video w-full" />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-[#8E8A96]">视频加载中...</div>
        )}
      </div>
      <div className="px-4 pt-4">
        <h2 className="text-xl font-semibold">{detail?.name}</h2>
        {artistId ? (
          <Link to={`/artist/${artistId}`} className="mt-1 inline-block text-sm text-[#E83C3C]">
            {artistName}
          </Link>
        ) : (
          <p className="mt-1 text-sm text-[#8E8A96]">{artistName}</p>
        )}
        <p className="mt-2 text-xs text-[#8E8A96]">{formatCount(detail?.playCount)} 次播放</p>
        {detail?.desc ? <p className="mt-3 text-sm leading-6 text-white/80">{detail.desc}</p> : null}
        <Link to={`/comments/${id}?type=mv`} className="mt-4 inline-block text-sm text-[#8E8A96]">
          查看评论
        </Link>
      </div>
    </div>
  );
}
