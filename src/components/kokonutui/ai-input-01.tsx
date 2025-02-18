"use client";

import { CornerRightUp, Mic } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { Textarea } from "~/components/ui/textarea";
import { useAutoResizeTextarea } from "~/hooks/use-auto-resize-textarea";

interface AIInput_01Props {
    onSend: (message: string) => void;
    isLoading?: boolean;
}

export default function AIInput_01({ onSend, isLoading }: AIInput_01Props) {
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 52,
        maxHeight: 200,
    });
    const [inputValue, setInputValue] = useState("");

    const handleReset = () => {
        onSend(inputValue);
        setInputValue("");
        adjustHeight(true);
    };

    return (
        <div className="w-full">
            <div className="relative w-full">
                <Textarea
                    id="ai-input-01"
                    placeholder="Type your message..."
                    className={cn(
                        "max-w-full bg-zinc-800 rounded-xl pl-6 pr-16",
                        "placeholder:text-zinc-500",
                        "border-none ring-zinc-700",
                        "text-white text-wrap",
                        "overflow-y-auto resize-none",
                        "focus-visible:ring-1 focus-visible:ring-zinc-600",
                        "transition-[height] duration-100 ease-out",
                        "leading-[1.2] py-[16px]",
                        "min-h-[52px]",
                        "max-h-[200px]"
                    )}
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        adjustHeight();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleReset();
                        }
                    }}
                    disabled={isLoading}
                />

                <div
                    className={cn(
                        "absolute top-1/2 -translate-y-1/2 rounded-lg bg-zinc-700/50 py-1 px-1 transition-all duration-200",
                        inputValue ? "right-10" : "right-3"
                    )}
                >
                    <Mic className="w-4 h-4 text-zinc-400" />
                </div>
                <button
                    onClick={handleReset}
                    type="button"
                    disabled={isLoading}
                    className={cn(
                        "absolute top-1/2 -translate-y-1/2 rounded-lg bg-zinc-700/50 py-1 px-1 transition-all duration-700",
                        inputValue
                            ? "block right-3 animate-slide-in cursor-pointer"
                            : "hidden"
                    )}
                >
                    <CornerRightUp className="w-4 h-4 text-zinc-400 transition-opacity duration-700" />
                </button>
            </div>
        </div>
    );
}
