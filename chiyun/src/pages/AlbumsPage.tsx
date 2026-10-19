import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNewAlbums, fetchTopAlbums } from "../api/client";
import type { AlbumCard } from "../api/types";
import { AlbumTile } from "../components/MediaCard";
import { Line, Rect } from "../components/Skeleton";

export default function AlbumsPage() {
  const navigate = useNavigate();
  const [newest, setNewest] = useState<AlbumCard[]>([]);
  const [top, setTop] = useState<AlbumCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchNewAlbums(), fetchTopAlbums(30)])
      .then(([a, b]) => {
        setNewest(a);
        setTop(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const list = newest.length ? newest : top;

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center bg-[#09090B]/90 px-2 pb-2 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl">
        <button type="button" aria-label="返回" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">新碟上架</h1>
      </header>
      {loading ? (
        <div className="grid grid-cols-3 gap-3 px-4 pt-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i}>
              <Rect className="aspect-square" />
              <Line className="mt-2 w-4/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 px-4 pt-2">
          {list.map((item) => (
            <AlbumTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
