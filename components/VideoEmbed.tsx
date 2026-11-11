import { isVertical, videoEmbedUrl, PLATFORM_LABEL } from "@/lib/video";

/** YouTube / Instagram / TikTok pleyeri (o'sha platformaning iframe'i); vertikal videolar uchun 9:16. */
export function VideoEmbed({ platform, id, url, title, className = "" }: { platform: string; id: string; url?: string | null; title: string; className?: string }) {
  const vertical = isVertical({ platform, url });
  return (
    <div className={`overflow-hidden rounded-card bg-black ring-1 ring-border ${vertical ? "mx-auto aspect-[9/16] w-full max-w-[380px]" : "aspect-video w-full"} ${className}`}>
      <iframe
        src={videoEmbedUrl({ platform, id })}
        title={`${title} — ${PLATFORM_LABEL[platform] ?? "video"}`}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
