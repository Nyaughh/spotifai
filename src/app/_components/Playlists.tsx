'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from "~/trpc/react";
import { ErrorToast } from "~/components/ui/error-toast";
import { MusicIcon, PlusIcon } from "lucide-react";
import { usePlaylistStore } from "~/store/playlistStore";

interface Playlist {
  id: string;
  name: string;
  images: { url: string }[];
  owner: {
    display_name: string;
  };
  tracks: {
    total: number;
  };
}

export function Playlists() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const { setCurrentPlaylist } = usePlaylistStore();

  // Fetch playlists
  const { data: playlists, isLoading: playlistsLoading } = api.spotify.getPlaylists.useQuery(undefined);

  // Mutations
  const createPlaylistMutation = api.spotify.createPlaylist.useMutation({
    onSuccess: () => {
      utils.spotify.getPlaylists.invalidate();
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    
    createPlaylistMutation.mutate({ name: newPlaylistName });
  };

  const handlePlaylistClick = (playlist: Playlist) => {
    setCurrentPlaylist(playlist.id);
    router.push(`/?playlist=${playlist.id}`, { scroll: false });
  };

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Please sign in to view your playlists</p>
      </div>
    );
  }

  if (playlistsLoading) {
    return (
      <div className="space-y-2 px-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="h-12 w-12 rounded bg-zinc-800/50 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-zinc-800/50 animate-pulse" />
              <div className="h-3 w-24 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="h-full">
        {/* Playlists List */}
        <div className="w-full overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Playlists</h2>
            <button
              onClick={() => setIsCreatingPlaylist(true)}
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-1 px-2">
            {playlists?.items.map((playlist: Playlist) => (
              <button
                key={playlist.id}
                onClick={() => handlePlaylistClick(playlist)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-800/50"
              >
                {playlist?.images?.[0] ? (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-800">
                    <MusicIcon className="h-6 w-6 text-zinc-400" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-white">
                    {playlist.name}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {playlist.owner.display_name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Create Playlist Dialog */}
        {isCreatingPlaylist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-zinc-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">Create New Playlist</h3>
              <form onSubmit={handleCreatePlaylist} className="space-y-4">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist name"
                  className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={createPlaylistMutation.isPending}
                    className="rounded-lg bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingPlaylist(false)}
                    className="rounded-lg bg-zinc-800 px-4 py-2 font-medium text-white hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {error && (
        <ErrorToast 
          message={error} 
          onDismiss={() => setError(null)} 
        />
      )}
    </>
  );
} 