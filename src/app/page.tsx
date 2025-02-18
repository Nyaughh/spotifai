import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import { AuthButtons } from "~/app/_components/AuthButtons";
import { MusicPlayer } from "~/app/_components/MusicPlayer";
import { Playlists } from "~/app/_components/Playlists";
import Image from "next/image";
import AIChat from './_components/AIChat';

export default async function Home() {
  const session = await getServerAuthSession();
  
  if (session) {
    return (
      <>
        <div className="flex min-h-screen flex-col bg-[#1DB954]">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-6">
            <h1 className="text-2xl font-bold text-white">Spotifai</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {session.user?.image && (
                  <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-white/20">
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? "Profile"}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <span className="text-sm font-medium text-white">
                  {session.user?.name}
                </span>
              </div>
              <a
                href="/api/auth/signout"
                className="rounded-full bg-black/20 px-4 py-2 text-sm font-medium text-white hover:bg-black/40"
              >
                Sign out
              </a>
            </div>
          </div>

          {/* Main Content with Sidebar */}
          <div className="flex flex-1">
            {/* Playlist Sidebar */}
            <div className="w-80 flex-shrink-0">
              <Playlists />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">AI Assistant</h2>
                <AIChat />
              </div>
            </div>
          </div>
        </div>
        <MusicPlayer />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      {/* Auth Container */}
      <div className="w-full max-w-[450px] rounded-lg bg-[#121212] p-8">
        <h2 className="mb-8 text-center text-4xl font-bold text-white">
          Spotifai
        </h2>

        <AuthButtons />

        {/* Terms */}
        <p className="mt-8 text-center text-xs text-gray-400">
          By continuing, you agree to Spotifai&apos;s{" "}
          <a href="#" className="text-white hover:underline">
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a href="#" className="text-white hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
