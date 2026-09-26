import { useState } from "react";
import { LoaderCircle } from "lucide-react";

type MediaType = "video" | "audio";

interface MediaPlayerProps {
    src: string;
    type: MediaType;
    title?: string;
    poster?: string;
}

export function MediaPlayer({
    src,
    type,
    title,
    poster,
}: MediaPlayerProps) {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-purple-500/40 bg-gradient-to-b from-purple-950 to-purple-900">
            {isLoading && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-purple-950/70">
                    <LoaderCircle
                        className="h-6 w-6 animate-spin text-purple-300"
                        aria-label="Loading media"
                    />
                </div>
            )}

            {type === "video" ? (
                <video
                    src={src}
                    title={title}
                    poster={poster}
                    controls
                    preload="none"
                    className="aspect-video w-full"
                    onLoadStart={() => setIsLoading(true)}
                    onWaiting={() => setIsLoading(true)}
                    onPlaying={() => setIsLoading(false)}
                    onCanPlay={() => setIsLoading(false)}
                    onError={() => setIsLoading(false)}
                />
            ) : (
                <div className="p-4">
                    <audio
                        src={src}
                        title={title}
                        controls
                        preload="none"
                        className="w-full"
                        onLoadStart={() => setIsLoading(true)}
                        onWaiting={() => setIsLoading(true)}
                        onPlaying={() => setIsLoading(false)}
                        onCanPlay={() => setIsLoading(false)}
                        onError={() => setIsLoading(false)}
                    />
                </div>
            )}
        </div>
    );
}
