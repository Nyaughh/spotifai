import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import { AuthButtons } from "~/app/_components/AuthButtons";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { MusicPlayer } from "~/app/_components/MusicPlayer";
import { api } from "~/trpc/server";
import { PlaylistTracks } from "~/app/_components/PlaylistTracks";
import { PlaylistContent } from "~/app/_components/PlaylistContent";

export default async function Home() {
  const session = await getServerAuthSession();
  
  if (session) {
    return (
      <DashboardLayout>
        <div className="flex flex-col flex-1">
          <PlaylistContent />
          <MusicPlayer />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      {/* Auth Container */}
      <div className="w-full max-w-[400px] rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          Spotifai
        </h2>

        <AuthButtons />

        {/* Terms */}
        <p className="mt-6 text-center text-xs text-zinc-500">
          By continuing, you agree to Spotifai&apos;s{" "}
          <a href="#" className="text-zinc-300 hover:underline">
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a href="#" className="text-zinc-300 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
