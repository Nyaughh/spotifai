'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from "~/trpc/react";
import { PlaylistTracks } from "./PlaylistTracks";
import { usePlaylistStore } from "~/store/playlistStore";
import { MusicIcon } from "lucide-react";

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface TopTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  uri: string;
  duration_ms: number;
}

interface TopArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
}

export function PlaylistContent() {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get('playlist');
  const { currentPlaylist } = usePlaylistStore();

  const { data: playlistTracks, isLoading: tracksLoading } = api.spotify.getPlaylistTracks.useQuery(
    { playlistId: playlistId! },
    { enabled: !!playlistId }
  );

  const { data: playlists } = api.spotify.getPlaylists.useQuery();

  const { data: topTracks } = api.spotify.getTopTracks.useQuery(
    undefined,
    { enabled: !playlistId }
  );

  const { data: topArtists } = api.spotify.getTopArtists.useQuery(
    undefined,
    { enabled: !playlistId }
  );

  const playMutation = api.spotify.play.useMutation({
    onSuccess: () => {
      utils.spotify.getPlayerState.invalidate();
    },
  });

  const utils = api.useUtils();

  // Welcome screen when no playlist is selected
  if (!playlistId) {
    return (
      <div className="p-8 space-y-8">
        {/* Welcome Banner */}
        <div className="h-[240px] bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 rounded-lg p-8 flex items-end">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Welcome to SpotifAI
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Your top tracks and artists
            </p>
          </div>
        </div>

        {/* Top Tracks */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Your Top Tracks</h2>
          <div className="grid grid-cols-2 gap-4">
            {topTracks?.items.slice(0, 10).map((track: TopTrack) => (
              <button
                key={track.id}
                onClick={() => playMutation.mutate({ uri: track.uri })}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800/50 group"
              >
                <img
                  src={track.album.images[0]?.url}
                  alt={track.name}
                  className="h-12 w-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-white truncate">
                    {track.name}
                  </div>
                  <div className="text-sm text-zinc-400 truncate">
                    {track.artists.map(a => a.name).join(', ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Top Artists */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Your Top Artists</h2>
          <div className="grid grid-cols-4 gap-4">
            {topArtists?.items.slice(0, 8).map((artist: TopArtist) => (
              <div key={artist.id} className="group">
                <div className="aspect-square mb-3">
                  <img
                    src={artist.images[0]?.url}
                    alt={artist.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="text-white font-medium truncate">
                  {artist.name}
                </div>
                <div className="text-sm text-zinc-400 truncate">
                  {artist.genres.slice(0, 2).join(' • ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (tracksLoading || !playlistTracks) {
    return (
      <div className="p-8">
        <div className="relative h-[240px] bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 rounded-lg">
          <div className="absolute inset-0 p-8 flex items-end">
            <div className="flex items-end gap-6">
              {/* Playlist Cover Skeleton */}
              <div className="w-48 h-48 rounded-lg bg-zinc-800/50 animate-pulse" />
              
              {/* Playlist Info Skeleton */}
              <div className="space-y-3 mb-2">
                <div className="w-16 h-4 bg-zinc-800/50 rounded animate-pulse" />
                <div className="w-64 h-8 bg-zinc-800/50 rounded animate-pulse" />
                <div className="w-32 h-4 bg-zinc-800/50 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          {/* Tracks Skeleton */}
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded bg-zinc-800/50 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-48 h-4 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="w-32 h-3 bg-zinc-800/50 rounded animate-pulse" />
                </div>
                {/* Duration Skeleton */}
                <div className="w-12 h-4 bg-zinc-800/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const playlist = playlists?.items.find((p: any) => p.id === playlistId);
  const formattedTracks = playlistTracks.items.map(({ track }: { track: any }) => ({
    id: track.uri,
    title: track.name,
    subtitle: track.artists.map((a: any) => a.name).join(', '),
    imageUrl: track.album.images[0]?.url,
    href: '#',
    duration: formatDuration(track.duration_ms),
  }));

  return (
    <div className="p-8">
      <div className="relative h-[240px] bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 rounded-lg overflow-hidden">
        {/* Background Image */}
        {playlist?.images[0] && (
          <div 
            className="absolute inset-0 opacity-40 bg-cover bg-center" 
            style={{ 
              backgroundImage: `url(${playlist.images[0].url})`,
              filter: 'blur(60px)',
            }} 
          />
        )}
        
        {/* Content */}
        <div className="absolute inset-0 p-8 flex items-end">
          <div className="flex flex-col">
            <div className="flex items-end gap-6">
              {/* Playlist Cover */}
              <div className="w-48 h-48 rounded-lg shadow-lg overflow-hidden flex-shrink-0">
                {playlist?.images[0] ? (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <MusicIcon className="w-12 h-12 text-zinc-600" />
                  </div>
                )}
              </div>
              
              {/* Playlist Info */}
              <div className="mb-2">
                <p className="text-sm font-medium text-zinc-400 mb-2">Playlist</p>
                <h1 className="text-5xl font-bold text-white mb-3">
                  {playlist?.name}
                </h1>
                <p className="text-sm text-zinc-400">
                  {playlistTracks.items.length} tracks
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <PlaylistTracks 
          items={formattedTracks} 
          tracks={playlistTracks.items.map(({ track }: { track: any }) => track)}
        />
      </div>
    </div>
  );
} 