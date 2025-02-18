'use client';

import { cn } from "~/lib/utils";
import { Play, MoreHorizontal, Heart, Clock, Music2 } from "lucide-react";
import { MusicIcon } from "lucide-react";

interface ListItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  href: string;
  onClick?: () => void;
  duration?: string;
}

interface List05Props {
  items: ListItem[];
}

export function List05({ items }: List05Props) {
  return (
    <div className="w-full bg-zinc-900/50 rounded-lg overflow-hidden">
      <div className="divide-y divide-zinc-800">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-zinc-800"
            onClick={item.onClick}
            role="button"
            tabIndex={0}
          >
            <div className="relative">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-12 w-12 flex-none rounded object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-800">
                  <MusicIcon className="h-6 w-6 text-zinc-400" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                {item.title}
              </p>
              <p className="mt-0.5 truncate text-sm text-zinc-400">
                {item.subtitle}
              </p>
            </div>
            {item.duration && (
              <div className="text-sm text-zinc-400">
                {item.duration}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
