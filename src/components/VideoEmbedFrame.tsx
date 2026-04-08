import { parseTrustedVideoEmbedSource } from "@/utils/videoEmbedSanitizer";
import { cn } from "@/lib/utils";

interface VideoEmbedFrameProps {
  /** Pasted iframe HTML or a plain https embed/watch URL (YouTube / Vimeo). */
  raw: string;
  title?: string;
  className?: string;
}

export function VideoEmbedFrame({ raw, title, className }: VideoEmbedFrameProps) {
  const parsed = parseTrustedVideoEmbedSource(raw);
  if (!parsed) {
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive",
          className
        )}
      >
        Video cannot be shown. Paste supported embed code (iframe) or an HTTPS YouTube/Vimeo URL.
      </div>
    );
  }
  return (
    <div
      className={cn(
        "aspect-video relative w-full overflow-hidden rounded-lg border shadow-sm",
        className
      )}
    >
      <iframe
        src={parsed.src}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title={title?.trim() || "Video content"}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
