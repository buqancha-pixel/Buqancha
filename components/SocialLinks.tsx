/** Bloger tarmoqlari — logolar bilan (Instagram, Telegram, YouTube). */
type Props = { instagram?: string | null; telegram?: string | null; youtube?: string | null; size?: "sm" | "md" };

const STYLE = {
  instagram: "bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fd5949_45%,#d6249f_60%,#285aeb_90%)]",
  telegram: "bg-[#229ED9]",
  youtube: "bg-[#FF0000]",
};

export function SocialLinks({ instagram, telegram, youtube, size = "md" }: Props) {
  const links = [
    instagram && { key: "instagram" as const, href: `https://www.instagram.com/${instagram}/`, label: `Instagram: @${instagram}`, icon: <InstagramIcon /> },
    telegram && { key: "telegram" as const, href: `https://t.me/${telegram}`, label: `Telegram: @${telegram}`, icon: <TelegramIcon /> },
    youtube && { key: "youtube" as const, href: youtube, label: "YouTube kanali", icon: <YoutubeIcon /> },
  ].filter(Boolean) as Array<{ key: keyof typeof STYLE; href: string; label: string; icon: React.ReactNode }>;
  if (!links.length) return null;
  const box = size === "sm" ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-5";
  return (
    <span className="flex flex-wrap items-center gap-2">
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={l.label}
          title={l.label}
          className={`grid ${box} place-items-center rounded-full text-white shadow-md ring-1 ring-white/20 transition-transform hover:scale-110 ${STYLE[l.key]}`}
        >
          {l.icon}
        </a>
      ))}
    </span>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.4 4.2 2.9 11.3c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 1.8 5.5c.2.7.6.8 1.1.4l2.6-2.1 5 3.7c.9.5 1.6.2 1.8-.9l3.1-14.5c.3-1.3-.5-1.9-1.4-1.3ZM9.6 14.3l-.4 4-1.5-4.6 10-6.3-8.1 6.9Z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="currentColor" />
      <path d="M10 9v6l5.2-3L10 9Z" fill="#FF0000" />
    </svg>
  );
}
