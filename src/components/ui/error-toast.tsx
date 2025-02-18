"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface ErrorToastProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 transform">
      <div className="flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg">
        <span>{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            onDismiss?.();
          }}
          className="rounded-full p-1 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 