export type ArtistLite = {
  id: number;
  name: string;
};

export type AlbumLite = {
  id: number;
  name: string;
  picUrl: string;
};

export type Track = {
  id: number;
  name: string;
  artists: ArtistLite[];
  album: AlbumLite;
  duration: number;
  mv?: number;
};

export type PlaylistCard = {
  id: number;
  name: string;
  coverImgUrl: string;
  playCount?: number;
  trackCount?: number;
  copywriter?: string;
};

export type BannerItem = {
  imageUrl: string;
  targetId: number;
  targetType: number;
  typeTitle: string;
  url?: string;
  titleColor?: string;
};

export type RankItem = {
  id: number;
  name: string;
  coverImgUrl: string;
  updateFrequency?: string;
  playCount?: number;
  description?: string;
  tracks?: { first: string; second: string }[];
};

export type RadioItem = {
  id: number;
  name: string;
  picUrl: string;
  rcmdtext?: string;
  category?: string;
  playCount?: number;
  subCount?: number;
  dj?: { nickname?: string };
};

export type CommentItem = {
  commentId: number;
  content: string;
  timeStr?: string;
  time?: number;
  likedCount?: number;
  user: {
    userId?: number;
    nickname: string;
    avatarUrl: string;
  };
};

export type AlbumCard = {
  id: number;
  name: string;
  picUrl: string;
  artistName?: string;
  publishTime?: number;
};

export type MvItem = {
  id: number;
  name: string;
  cover: string;
  artistName?: string;
  playCount?: number;
  duration?: number;
  artistId?: number;
};
