import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import AlbumPage from "./pages/AlbumPage";
import ArtistPage from "./pages/ArtistPage";
import CommentsPage from "./pages/CommentsPage";
import DailyPage from "./pages/DailyPage";
import DiscoverPage from "./pages/DiscoverPage";
import FmPage from "./pages/FmPage";
import MinePage from "./pages/MinePage";
import MvPage from "./pages/MvPage";
import PlaylistPage from "./pages/PlaylistPage";
import RadioPage from "./pages/RadioPage";
import RankPage from "./pages/RankPage";
import SearchPage from "./pages/SearchPage";
import SquarePage from "./pages/SquarePage";
import AlbumsPage from "./pages/AlbumsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/rank" element={<RankPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/mine" element={<MinePage />} />
        <Route path="/daily" element={<DailyPage />} />
        <Route path="/square" element={<SquarePage />} />
        <Route path="/albums" element={<AlbumsPage />} />
        <Route path="/mv" element={<MvPage />} />
        <Route path="/mv/:id" element={<MvPage />} />
        <Route path="/fm" element={<FmPage />} />
        <Route path="/playlist/:id" element={<PlaylistPage />} />
        <Route path="/album/:id" element={<AlbumPage />} />
        <Route path="/artist/:id" element={<ArtistPage />} />
        <Route path="/radio/:id" element={<RadioPage />} />
        <Route path="/comments/:id" element={<CommentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
