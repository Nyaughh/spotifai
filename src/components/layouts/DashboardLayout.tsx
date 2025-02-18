"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "~/lib/utils";
import { Home, User, ChevronRight, ChevronLeft, Plus, HomeIcon, LogOut } from "lucide-react";
import Image from "next/image";
import { Playlists } from "~/app/_components/Playlists";
import AIChat from "~/app/_components/AIChat";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { MUSIC_PLAYER_HEIGHT } from "~/app/_components/MusicPlayer";
import { useRouter } from 'next/navigation';
import { usePlaylistStore } from "~/store/playlistStore";
import Text01 from "~/components/kokonutui/text-01";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const router = useRouter();
  const { setCurrentPlaylist } = usePlaylistStore();

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPlaylist(null);
    router.push('/', { scroll: false });
  };

  return (
    <div 
      className="flex h-screen flex-col bg-zinc-950"
      style={{ paddingBottom: `${MUSIC_PLAYER_HEIGHT}px` }}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="flex w-[300px] flex-col border-r border-zinc-800 bg-zinc-900">
          {/* Logo and Navigation */}
          <div className="p-4 space-y-2">
            <Text01 />
            <div className="space-y-1">
              <a 
                href="/"
                onClick={handleHomeClick}
                className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              >
                <HomeIcon className="h-5 w-5" />
                <span>Home</span>
              </a>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors text-zinc-400 hover:bg-zinc-800/50 hover:text-white">
                    <User className="h-5 w-5" />
                    <span>Profile</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 border-zinc-800 bg-zinc-900">
                  {session?.user && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {session.user.image && (
                          <div className="h-16 w-16 overflow-hidden rounded-full ring-1 ring-zinc-700">
                            <Image
                              src={session.user.image}
                              alt={session.user.name ?? "Profile"}
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">
                            {session.user.name}
                          </div>
                          <div className="text-sm text-zinc-400">
                            {session.user.email}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 p-2 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* User Playlists */}
          <div className="flex-1 overflow-y-auto border-t border-zinc-800 py-4">
            <Playlists />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </div>

        {/* Right Sidebar - AI Chat */}
        <div
          className={cn(
            "relative flex w-[400px] flex-col border-l border-zinc-800 bg-zinc-900 transition-all duration-300",
            !isRightSidebarOpen && "w-0"
          )}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="absolute -left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 shadow-lg hover:bg-zinc-700 hover:text-white"
          >
            {isRightSidebarOpen ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {isRightSidebarOpen && (
            <>

              {/* Chat Content */}
              <div className="flex-1 overflow-hidden p-4">
                <AIChat />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 