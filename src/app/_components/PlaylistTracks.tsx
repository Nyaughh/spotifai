'use client';

import { List05 } from "~/components/kokonutui/list-05";
import { api } from "~/trpc/react";
import { usePlaylistStore } from "~/store/playlistStore";

interface Track {
  uri: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
}

interface ListItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  href: string;
}

interface PlaylistTracksProps {
  items: ListItem[];
  tracks: Track[]; 
}

export function PlaylistTracks({ items, tracks }: PlaylistTracksProps) {
  const playMutation = api.spotify.play.useMutation();
  const { setCurrentTrack, setIsPlaying } = usePlaylistStore();

  const handlePlay = (uri: string) => {
    const track = tracks.find(t => t.uri === uri);
    if (track) {
      setCurrentTrack(track);
      setIsPlaying(true);
      playMutation.mutate({ uri });
    }
  };

  return (
    <List05 
      items={items.map(item => ({
        ...item,
        onClick: () => handlePlay(item.id),
      }))}
    />
  );
} 