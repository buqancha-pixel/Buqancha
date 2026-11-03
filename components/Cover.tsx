import { CoverImage } from "./CoverImage";

type Props = {
  title: string;
  author?: string;
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** haqiqiy muqova rasmi (bo'lsa); yuklanmasa — chizilgan muqova ko'rsatiladi */
  image?: string | null;
};

/** Muqova: haqiqiy rasm yoki generatsiya qilingan (rang + nom + muallif). */
export function Cover({ title, author, color, className = "", size = "md", image }: Props) {
  const drawn = <DrawnCover title={title} author={author} color={color} size={size} />;
  return (
    <div className={`cover ${className}`} aria-hidden="true">
      {image ? <CoverImage src={image} fallback={drawn} /> : drawn}
    </div>
  );
}

function DrawnCover({ title, author, color, size }: Omit<Props, "className" | "image">) {
  const titleSize = size === "lg" ? "text-xl" : size === "sm" ? "text-[11px]" : "text-sm";
  return (
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(155deg, ${color} 0%, color-mix(in oklab, ${color} 70%, black) 100%)` }}
    >
      <div className="absolute inset-x-0 top-[12%] mx-[12%] h-px bg-white/40" />
      <div className="absolute inset-x-0 bottom-[12%] mx-[12%] h-px bg-white/30" />
      <div className="absolute inset-0 flex flex-col justify-between px-[12%] py-[18%]">
        <span className={`font-heading ${titleSize} leading-tight font-semibold [text-wrap:balance]`}>{title}</span>
        {author && <span className="text-[10px] uppercase tracking-wider opacity-80 sm:text-[11px]">{author}</span>}
      </div>
    </div>
  );
}
