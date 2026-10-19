import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHighqualityPlaylists, fetchPlaylistCats, fetchPlaylistSquare } from "../api/client";
import type { PlaylistCard as PlaylistCardType } from "../api/types";
import PlaylistCard from "../components/PlaylistCard";
import { Line, Rect } from "../components/Skeleton";

export default function SquarePage() {
  const navigate = useNavigate();
  const [cat, setCat] = useState("全部");
  const [cats, setCats] = useState<string[]>(["全部"]);
  const [hq, setHq] = useState<PlaylistCardType[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistCardType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylistCats()
      .then((data) => {
        const names = (data.sub ?? []).map((item) => item.name);
        setCats(["全部", ...names.slice(0, 24)]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchHighqualityPlaylists(cat, 6).catch(() => []),
      fetchPlaylistSquare(cat, 30, 0).catch(() => ({ playlists: [] as PlaylistCardType[], total: 0 })),
    ])
      .then(([high, square]) => {
        if (!alive) return;
        setHq(high);
        setPlaylists(square.playlists);
      })
      .catch(() => {
        if (alive) {
          setHq([]);
          setPlaylists([]);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cat]);

  return (
    <div>
      <header className="sticky top-0 z-20 bg-[#09090B]/90 px-2 pb-2 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center">
          <button type="button" aria-label="返回" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold">歌单广场</h1>
        </div>
        <div className="hide-scrollbar mt-1 flex gap-2 overflow-x-auto px-2 pb-1">
          {cats.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCat(item)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                cat === item ? "bg-[#E83C3C] text-white" : "bg-[#1c1c22] text-[#F4F1EA]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      {hq.length ? (
        <section className="mt-3">
          <h2 className="px-4 text-sm text-[#8E8A96]">精品歌单</h2>
          <div className="hide-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
            {hq.map((item) => (
              <div key={item.id} className="w-36 shrink-0">
                <PlaylistCard item={item} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 px-4 pb-4">
        <h2 className="mb-3 text-sm text-[#8E8A96]">{cat}歌单</h2>
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i}>
                <Rect className="aspect-square" />
                <Line className="mt-2 w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {playlists.map((item) => (
              <PlaylistCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
