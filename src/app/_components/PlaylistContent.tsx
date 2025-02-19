'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from "~/trpc/react";
import { PlaylistTracks } from "./PlaylistTracks";
import { usePlaylistStore } from "~/store/playlistStore";
import { MusicIcon, Search, X, MoreVertical, PlayIcon, Plus } from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

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

interface FormattedTrack {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  href: string;
  duration: string;
  uri: string;
}

export function PlaylistContent() {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get('playlist');
  const { currentPlaylist } = usePlaylistStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedTrackUri, setSelectedTrackUri] = useState<string | null>(null);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const { data: searchResults, isLoading: searchLoading } = api.spotify.searchTracks.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );

  const playMutation = api.spotify.play.useMutation({
    onSuccess: () => {
      utils.spotify.getPlayerState.invalidate();
    },
  });

  const addToQueueMutation = api.spotify.addToQueue.useMutation();

  const addToPlaylistMutation = api.spotify.addTracksToPlaylist.useMutation({
    onSuccess: () => {
      utils.spotify.getPlaylistTracks.invalidate();
    },
  });

  const utils = api.useUtils();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchResults(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleAddToPlaylist = async (targetPlaylistId: string) => {
    if (!selectedTrackUri) return;
    
    try {
      await addToPlaylistMutation.mutateAsync({
        playlistId: targetPlaylistId,
        uris: [selectedTrackUri],
      });
      setShowPlaylistSelector(false);
      setSelectedTrackUri(null);
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      setError('Failed to add track to playlist');
    }
  };

  const handleSendMessage = (message: string) => {
    // Emit a custom event that AIChat component will listen to
    const event = new CustomEvent('sendAIMessage', { detail: message });
    window.dispatchEvent(event);
  };

  const recommendations = [
    "Create a personalized playlist based on my music taste",
    "Help me discover new music similar to my top artists",
    "Make a playlist for my workout session"
  ];

  // Welcome screen when no playlist is selected
  if (!playlistId) {
    return (
      <div className="p-8 space-y-8">
        {/* Search Bar */}
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search for songs, artists, or albums..."
              className="w-full h-12 pl-12 pr-12 rounded-full bg-zinc-800/50 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-700"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {showSearchResults && searchQuery && (
            <div className="absolute w-full mt-2 rounded-lg bg-zinc-900 border border-zinc-800 shadow-lg overflow-hidden z-[100]">
              {searchLoading ? (
                <div className="p-4 text-center text-zinc-400">
                  Searching...
                </div>
              ) : searchResults?.tracks?.items?.length > 0 ? (
                <ScrollArea className="h-[60vh]">
                  <div className="p-1">
                    {searchResults.tracks.items.map((track: any) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-4 w-full p-3 hover:bg-zinc-800/50 transition-colors rounded-md group"
                      >
                        <div className="relative h-12 w-12">
                          <img
                            src={track.album.images[0]?.url}
                            alt={track.name}
                            className="h-full w-full rounded object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                            <button
                              onClick={() => {
                                playMutation.mutate({ uri: track.uri });
                                clearSearch();
                              }}
                              className="text-white hover:scale-110 transition-transform"
                            >
                              <PlayIcon className="h-6 w-6" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium text-white truncate">
                            {track.name}
                          </div>
                          <div className="text-sm text-zinc-400 truncate">
                            {track.artists.map((a: any) => a.name).join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-4 text-center text-zinc-400">
                  No results found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Welcome Banner */}
        <div className="relative h-[160px] overflow-hidden rounded-xl bg-gradient-to-br from-purple-600/30 via-zinc-900 to-zinc-900 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(147,51,234,0.1),transparent_70%)]" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
                Welcome to SpotifAI
              </h1>
              <p className="text-sm text-zinc-300">
                Your intelligent music companion. Ask me anything about music.
              </p>
            </div>
            <div className="text-xs text-zinc-400">
              Try these suggestions or ask me your own questions
            </div>
          </div>
        </div>

        {/* Suggested Prompts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendations.map((rec) => (
            <button
              key={rec}
              onClick={() => handleSendMessage(rec)}
              className="p-4 text-left text-sm rounded-lg bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all hover:shadow-lg hover:shadow-purple-500/5 hover:border-purple-500/10 border border-transparent"
            >
              {rec}
            </button>
          ))}
        </div>

        {/* Top Tracks */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Your Top Tracks</h2>
          <div className="grid grid-cols-2 gap-4">
            {topTracks?.items.slice(0, 10).map((track: TopTrack) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800/50 group"
              >
                <div className="relative h-12 w-12">
                  <img
                    src={track.album.images[0]?.url}
                    alt={track.name}
                    className="h-full w-full rounded object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                    <button
                      onClick={() => playMutation.mutate({ uri: track.uri })}
                      className="text-white hover:scale-110 transition-transform"
                    >
                      <PlayIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-white truncate">
                    {track.name}
                  </div>
                  <div className="text-sm text-zinc-400 truncate">
                    {track.artists.map(a => a.name).join(', ')}
                  </div>
                </div>
              </div>
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
    uri: track.uri,
  }));

  return (
    <div className="p-8">
      <div className="relative h-[240px] bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 rounded-lg overflow-hidden">
        {/* Background Image */}
        {playlist?.images && playlist.images.length > 0 ? (
          <div 
            className="absolute inset-0 opacity-40 bg-cover bg-center" 
            style={{ 
              backgroundImage: `url(${playlist.images[0].url})`,
              filter: 'blur(60px)',
            }} 
          />
        ) : null}
        
        {/* Content */}
        <div className="absolute inset-0 p-8 flex items-end">
          <div className="flex flex-col">
            <div className="flex items-end gap-6">
              {/* Playlist Cover */}
              <div className="w-48 h-48 rounded-lg shadow-lg overflow-hidden flex-shrink-0">
                {playlist?.images && playlist.images.length > 0 ? (
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
        <div className="space-y-2">
          {formattedTracks.map((track: FormattedTrack) => (
            <div key={track.id} className="group flex items-center gap-4 p-2 rounded-md hover:bg-zinc-800/50">
              <div className="relative h-12 w-12">
                <img
                  src={track.imageUrl}
                  alt={track.title}
                  className="h-full w-full rounded object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                  <button
                    onClick={() => playMutation.mutate({ uri: track.uri })}
                    className="text-white hover:scale-110 transition-transform"
                  >
                    <PlayIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">
                  {track.title}
                </div>
                <div className="text-sm text-zinc-400 truncate">
                  {track.subtitle}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">
                  {track.duration}
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1 bg-zinc-900 border-zinc-800">
                    <button
                      onClick={() => playMutation.mutate({ uri: track.uri })}
                      className="w-full text-left px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
                    >
                      Play Now
                    </button>
                    <button
                      onClick={() => addToQueueMutation.mutate({ uri: track.uri })}
                      className="w-full text-left px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
                    >
                      Add to Queue
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTrackUri(track.uri);
                        setShowPlaylistSelector(true);
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
                    >
                      Add to Playlist
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Playlist Selector Dialog */}
      <Dialog open={showPlaylistSelector} onOpenChange={setShowPlaylistSelector}>
        <DialogContent className="bg-zinc-900 border border-zinc-800 p-0 max-h-[80vh]">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
            <DialogTitle className="text-xl font-semibold text-white">Add to Playlist</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-2">
            <div className="space-y-1">
              {playlists?.items.map((playlist: any) => (
                <button
                  key={playlist.id}
                  onClick={() => handleAddToPlaylist(playlist.id)}
                  className="flex w-full items-center gap-4 p-3 rounded-md text-left hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                    {playlist?.images?.[0] ? (
                      <img
                        src={playlist.images[0].url}
                        alt={playlist.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                        <MusicIcon className="h-6 w-6 text-zinc-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                      {playlist.name}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {playlist.tracks.total} tracks
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-5 w-5 text-zinc-400" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
} 