"use client";

import { CornerRightUp } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { Textarea } from "~/components/ui/textarea";
import { useAutoResizeTextarea } from "~/hooks/use-auto-resize-textarea";
import { ScrollArea } from "~/components/ui/scroll-area";

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
    const [isFocused, setIsFocused] = useState(false);

    const handleReset = () => {
        if (!inputValue.trim() || isLoading) return;
        onSend(inputValue);
        setInputValue("");
        adjustHeight(true);
    };

    return (
        <div className="w-full">
            <div className="relative w-full">
                <ScrollArea className="max-h-[200px]">
                    <Textarea
                        id="ai-input-01"
                        placeholder="Ask me anything about music..."
                        className={cn(
                            "max-w-full bg-zinc-800/50 rounded-2xl pl-6 pr-12",
                            "placeholder:text-zinc-500",
                            "border-none",
                            "text-white text-wrap",
                            "resize-none",
                            "ring-offset-zinc-950 ring-offset-2",
                            "focus-visible:ring-2 focus-visible:ring-purple-500/50",
                            "transition-all duration-200",
                            "leading-[1.2] py-[16px]",
                            "min-h-[52px]",
                            isFocused && "bg-zinc-800/80"
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
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        disabled={isLoading}
                    />
                </ScrollArea>

                <button
                    onClick={handleReset}
                    type="button"
                    disabled={isLoading || !inputValue.trim()}
                    className={cn(
                        "absolute top-1/2 -translate-y-1/2 right-3 rounded-lg transition-all duration-200",
                        "hover:bg-purple-500/20 p-1.5",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        inputValue.trim() ? "opacity-100" : "opacity-0"
                    )}
                >
                    <CornerRightUp 
                        className={cn(
                            "w-4 h-4 transition-all duration-200",
                            inputValue.trim() ? "text-purple-400" : "text-zinc-400"
                        )}
                    />
                </button>
            </div>
        </div>
    );
}
