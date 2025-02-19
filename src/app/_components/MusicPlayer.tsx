'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { api } from "~/trpc/react";
import { ErrorToast } from "~/components/ui/error-toast";
import { usePlaylistStore } from "~/store/playlistStore";
import { cn } from "~/lib/utils";
import { ScrollArea } from "~/components/ui/scroll-area";
import { ListMusic } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album?: {
    name: string;
    images: { url: string }[];
  };
  is_playing?: boolean;
  uri?: string;
  duration_ms?: number;
  progress_ms?: number;
}

interface SearchResults {
  tracks?: {
    items: Track[];
  };
}

interface PlayerState {
  is_playing: boolean;
  progress_ms: number;
  duration_ms: number;
  volume_percent: number;
  shuffle_state: boolean;
  repeat_state: 'off' | 'track' | 'context';
}

const PLAYER_HEIGHT = 88; // px - height of the player

export function MusicPlayer() {
  const { data: session, status } = useSession();
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying } = usePlaylistStore();
  const [playerState, setPlayerState] = useState<PlayerState>({
    is_playing: false,
    progress_ms: 0,
    duration_ms: 0,
    volume_percent: 50,
    shuffle_state: false,
    repeat_state: 'off',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout>();
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const [showQueue, setShowQueue] = useState(false);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const updateProgress = useCallback(() => {
    if (playerState.is_playing) {
      setPlayerState(prev => ({
        ...prev,
        progress_ms: Math.min(prev.progress_ms + 1000, prev.duration_ms),
      }));
    }
  }, [playerState.is_playing]);

  useEffect(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    progressInterval.current = setInterval(updateProgress, 1000);
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [updateProgress]);

  const { data: playerStateData } = api.spotify.getPlayerState.useQuery(
    undefined,
    {
      refetchInterval: 1000,
    }
  );

  useEffect(() => {
    if (playerStateData) {
      setPlayerState({
        is_playing: playerStateData.is_playing,
        progress_ms: playerStateData.progress_ms,
        duration_ms: playerStateData.item?.duration_ms ?? 0,
        volume_percent: playerStateData.device?.volume_percent ?? 50,
        shuffle_state: playerStateData.shuffle_state,
        repeat_state: playerStateData.repeat_state,
      });
      
      if (playerStateData.item && (!currentTrack || playerStateData.item.uri !== currentTrack.uri)) {
        setCurrentTrack(playerStateData.item);
        setIsPlaying(playerStateData.is_playing);
      }
    }
  }, [playerStateData, currentTrack]);

  const { data: currentTrackData, error: currentTrackError } = api.spotify.getCurrentTrack.useQuery(
    undefined,
    {
      refetchInterval: 10000,
    }
  );

  const playMutation = api.spotify.play.useMutation({
    onSuccess: () => utils.spotify.getPlayerState.invalidate(),
  });

  const pauseMutation = api.spotify.pause.useMutation({
    onSuccess: () => utils.spotify.getPlayerState.invalidate(),
  });

  const nextMutation = api.spotify.next.useMutation({
    onSuccess: () => utils.spotify.getPlayerState.invalidate(),
  });

  const previousMutation = api.spotify.previous.useMutation({
    onSuccess: () => utils.spotify.getPlayerState.invalidate(),
  });

  const seekMutation = api.spotify.seek.useMutation({
    onSuccess: () => utils.spotify.getPlayerState.invalidate(),
  });

  const volumeMutation = api.spotify.setVolume.useMutation({
    onSuccess: () => utils.spotify.getPlayerState.invalidate(),
  });

  const shuffleMutation = api.spotify.shuffle.useMutation({
    onSuccess: () => utils.spotify.getPlayerState.invalidate(),
  });

  const repeatMutation = api.spotify.repeat.useMutation({
    onSuccess: () => utils.spotify.getPlayerState.invalidate(),
  });

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseMutation.mutate();
      setIsPlaying(false);
    } else if (currentTrack) {
      playMutation.mutate({ uri: currentTrack.uri });
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerState.duration_ms || isLoading) return;

    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const seekMs = Math.floor(position * playerState.duration_ms);

    seekMutation.mutate({ position_ms: seekMs });
    // Update local state immediately for smoother UX
    setPlayerState(prev => ({ ...prev, progress_ms: seekMs }));
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLoading) return;

    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const volume = Math.round(((e.clientX - rect.left) / rect.width) * 100);

    volumeMutation.mutate({ volume_percent: volume });
    // Update local state immediately for smoother UX
    setPlayerState(prev => ({ ...prev, volume_percent: volume }));
  };

  const handleSkip = async (direction: 'next' | 'previous') => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/spotify/${direction}`, { method: 'POST' });
      if (response.ok) {
        // Wait a bit for Spotify to update
        await new Promise(resolve => setTimeout(resolve, 500));
        // Fetch the new current track
        const trackResponse = await fetch('/api/spotify/current-track');
        if (trackResponse.ok) {
          const data = await trackResponse.json();
          setCurrentTrack(data);
          setPlayerState(prev => ({ ...prev, is_playing: data.is_playing ?? false }));
        }
      }
    } catch (error) {
      console.error('Error skipping track:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'x-spotify-token': session?.accessToken || ''
        } as HeadersInit
      });
      if (response.ok) {
        const data: SearchResults = await response.json();
        setSearchResults(data.tracks?.items ?? []);
      }
    } catch (error) {
      console.error('Error searching tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const playTrack = async (uri: string) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/spotify/play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uri }),
      });
      if (response.ok) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        // Wait a bit for Spotify to update
        await new Promise(resolve => setTimeout(resolve, 500));
        // Fetch the new current track
        const trackResponse = await fetch('/api/spotify/current-track');
        if (trackResponse.ok) {
          const data = await trackResponse.json();
          setCurrentTrack(data);
          setPlayerState(prev => ({ ...prev, is_playing: data.is_playing ?? false }));
        }
      }
    } catch (error) {
      console.error('Error playing track:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { data: searchData } = api.spotify.searchTracks.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );

  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData.tracks?.items ?? []);
    }
  }, [searchData]);

  const handleTrackSelect = (track: Track) => {
    playMutation.mutate({ uri: track.uri });
    setShowSearch(false);
    setSearchQuery('');
  };

  // Add queue-related queries and mutations
  const { data: queueData } = api.spotify.getQueue.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const addToQueueMutation = api.spotify.addToQueue.useMutation({
    onSuccess: () => {
      utils.spotify.getQueue.invalidate();
    },
  });

  const handleAddToQueue = async (uri: string) => {
    try {
      await addToQueueMutation.mutateAsync({ uri });
    } catch (error) {
      console.error('Error adding to queue:', error);
      setError('Failed to add track to queue');
    }
  };

  if (status !== 'authenticated') return null;

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-lg"
        style={{ height: `${PLAYER_HEIGHT}px` }}
      >
        <div className="flex h-full items-center px-8">
          {/* Now Playing - Left Section */}
          <div className="flex w-1/3 items-center justify-start gap-4">
            {currentTrack ? (
              <>
                {currentTrack.album?.images[0] && (
                  <img
                    src={currentTrack.album.images[0].url}
                    alt={currentTrack.name}
                    className="h-14 w-14 rounded-md"
                  />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">
                    {currentTrack.name}
                  </div>
                  <div className="truncate text-sm text-zinc-400">
                    {currentTrack.artists.map(a => a.name).join(', ')}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-zinc-400">
                Not Playing
              </div>
            )}
          </div>

          {/* Playback Controls - Center Section */}
          <div className="flex w-1/3 flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => shuffleMutation.mutate({ state: !playerState.shuffle_state })}
                className={cn(
                  "rounded-full p-2 transition-colors",
                  playerState.shuffle_state 
                    ? "text-zinc-200 hover:text-white" 
                    : "text-zinc-400 hover:text-white"
                )}
                disabled={isLoading}
              >
                <ShuffleIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => previousMutation.mutate()}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                disabled={isLoading}
              >
                <PreviousIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handlePlayPause}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:scale-105"
                disabled={isLoading}
              >
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5" />
                ) : (
                  <PlayIcon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={() => nextMutation.mutate()}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                disabled={isLoading}
              >
                <NextIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => repeatMutation.mutate({ 
                  state: playerState.repeat_state === 'off' ? 'context' : 
                         playerState.repeat_state === 'context' ? 'track' : 'off' 
                })}
                className={cn(
                  "rounded-full p-2 transition-colors",
                  playerState.repeat_state !== 'off'
                    ? "text-zinc-200 hover:text-white" 
                    : "text-zinc-400 hover:text-white"
                )}
                disabled={isLoading}
              >
                <RepeatIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex w-full items-center gap-2 px-4 text-xs text-zinc-400">
              <span className="w-10 text-right">{formatTime(playerState.progress_ms)}</span>
              <div
                className="relative h-1 flex-1 cursor-pointer rounded-full bg-zinc-800"
                onClick={handleSeek}
              >
                <div
                  className="absolute h-full rounded-full bg-white group-hover:bg-zinc-200"
                  style={{
                    width: `${(playerState.progress_ms / playerState.duration_ms) * 100}%`,
                  }}
                />
              </div>
              <span className="w-10">{formatTime(playerState.duration_ms)}</span>
            </div>
          </div>

          {/* Volume Control - Right Section */}
          <div className="flex w-1/3 items-center justify-end gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <ListMusic className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-zinc-900 border-zinc-800">
                <div className="p-2 border-b border-zinc-800">
                  <h3 className="font-medium text-sm text-white">Queue</h3>
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-4">
                    {queueData?.currently_playing && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-zinc-400">Now Playing</h4>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10">
                            <img
                              src={queueData.currently_playing.album.images[0]?.url}
                              alt={queueData.currently_playing.name}
                              className="h-full w-full rounded object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                              <button
                                onClick={() => playMutation.mutate({ uri: queueData.currently_playing.uri })}
                                className="text-white hover:scale-110 transition-transform"
                              >
                                <PlayIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-white truncate">
                              {queueData.currently_playing.name}
                            </div>
                            <div className="text-xs text-zinc-400 truncate">
                              {queueData.currently_playing.artists.map((a: any) => a.name).join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {queueData?.queue && queueData.queue.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-zinc-400">Next Up</h4>
                        <div className="space-y-2">
                          {queueData.queue.map((track: any) => (
                            <div key={track.uri} className="flex items-center gap-3 group">
                              <div className="relative h-10 w-10">
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
                                    <PlayIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-white truncate">
                                  {track.name}
                                </div>
                                <div className="text-xs text-zinc-400 truncate">
                                  {track.artists.map((a: any) => a.name).join(', ')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!queueData?.queue || queueData.queue.length === 0) && (
                      <div className="text-center text-sm text-zinc-400 py-4">
                        Queue is empty
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <div className="group flex items-center gap-2">
              <VolumeIcon className="h-5 w-5 text-zinc-400" />
              <div 
                className="h-1 w-24 cursor-pointer rounded-full bg-zinc-800"
                onClick={handleVolumeChange}
              >
                <div 
                  className="h-full rounded-full bg-white group-hover:bg-zinc-200"
                  style={{ width: `${playerState.volume_percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <ErrorToast 
          message={error} 
          onDismiss={() => setError(null)} 
        />
      )}

      {/* Search Overlay - Moved outside */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm">
          <div className="h-full max-w-2xl mx-auto p-4 flex flex-col">
            {/* Search Header */}
            <div className="flex items-center gap-4 bg-zinc-900/90 p-4 rounded-t-lg border-b border-zinc-800">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for songs..."
                  className="w-full bg-zinc-800 text-white px-4 py-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 text-zinc-400 hover:text-white"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto bg-zinc-900/90 rounded-b-lg">
              {searchResults.length > 0 && (
                <div className="p-4 space-y-2">
                  {searchResults.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => {
                        playMutation.mutate({ uri: track.uri });
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="flex items-center gap-3 w-full p-2 hover:bg-zinc-800 rounded-lg group"
                    >
                      {track.album?.images[0] && (
                        <img
                          src={track.album.images[0].url}
                          alt={track.name}
                          className="h-10 w-10 rounded"
                        />
                      )}
                      <div className="flex-1 text-left min-w-0">
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Export the height constant for use in other components
export const MUSIC_PLAYER_HEIGHT = PLAYER_HEIGHT;

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PreviousIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
    </svg>
  );
}

function NextIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M14.805 18.44c-1.25.713-2.805-.19-2.805-1.629v-2.34L5.055 18.44c-1.25.714-2.805-.188-2.805-1.628V8.688c0-1.44 1.555-2.342 2.805-1.628L12 11.03v-2.34c0-1.44 1.555-2.343 2.805-1.629l7.108 4.062c1.26.72 1.26 2.536 0 3.256l-7.108 4.061z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
      <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
  );
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" clipRule="evenodd" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path fillRule="evenodd" d="M15 3.75a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V5.56l-3.97 3.97a.75.75 0 11-1.06-1.06l3.97-3.97h-2.69a.75.75 0 01-.75-.75zm-12 0A.75.75 0 013.75 3h4.5a.75.75 0 010 1.5H5.56l3.97 3.97a.75.75 0 01-1.06 1.06L4.5 5.56v2.69a.75.75 0 01-1.5 0v-4.5zm11.47 11.78a.75.75 0 111.06-1.06l3.97 3.97v-2.69a.75.75 0 011.5 0v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 010-1.5h2.69l-3.97-3.97zm-4.94-1.06a.75.75 0 010 1.06L5.56 19.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v2.69l3.97-3.97a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
  );
}

function ShuffleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"/>
      <path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"/>
    </svg>
  );
}

function RepeatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"/>
    </svg>
  );
} 