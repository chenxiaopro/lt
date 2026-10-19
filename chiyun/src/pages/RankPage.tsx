import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchToplists } from "../api/client";
import type { RankItem } from "../api/types";
import Cover from "../components/Cover";
import { Rect } from "../components/Skeleton";

export default function RankPage() {
  const [list, setList] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchToplists()
      .then(setList)
      .finally(() => setLoading(false));
  }, []);

  const official = list.slice(0, 4);
  const rest = list.slice(4, 24);

  return (
    <div>
      <header className="px-4 pb-2 pt-[max(18px,env(safe-area-inset-top))]">
        <h1 className="text-2xl font-semibold">排行榜</h1>
        <p className="mt-1 text-sm text-[#8E8A96]">官方榜单，每天都在更新</p>
      </header>

      <section className="px-4">
        <h2 className="mb-3 text-sm text-[#8E8A96]">官方榜</h2>
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Rect key={i} className="h-24" />)
            : official.map((item) => (
                <Link
                  key={item.id}
                  to={`/playlist/${item.id}`}
                  className="pressable flex gap-3 overflow-hidden rounded-2xl bg-[#141418] p-2"
                >
                  <div className="relative">
                    <Cover src={item.coverImgUrl} alt={item.name} size={200} className="h-24 w-24" />
                    <span className="absolute bottom-1 left-1 text-[10px] text-white/80">
                      {item.updateFrequency}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 pr-2">
                    {(item.tracks ?? []).slice(0, 3).map((track, i) => (
                      <p key={i} className="truncate text-[13px] text-[#F4F1EA]/90">
                        {i + 1}. {track.first} - {track.second}
                      </p>
                    ))}
                  </div>
                </Link>
              ))}
        </div>
      </section>

      <section className="mt-6 px-4 pb-4">
        <h2 className="mb-3 text-sm text-[#8E8A96]">精选榜</h2>
        <div className="grid grid-cols-3 gap-3">
          {rest.map((item) => (
            <Link key={item.id} to={`/playlist/${item.id}`} className="pressable min-w-0">
              <div className="relative">
                <Cover src={item.coverImgUrl} alt={item.name} size={280} className="aspect-square w-full" rounded="rounded-2xl" />
                <span className="absolute bottom-1 left-1 text-[10px] text-white">{item.updateFrequency}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs">{item.name}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
