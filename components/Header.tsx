import Link from "next/link";
import { ThemeToggle, type Theme } from "./ThemeToggle";
import { SearchForm } from "./SearchForm";

export function Header({ theme, showSearch = true }: { theme: Theme; showSearch?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Buqancha — bosh sahifa">
          <Logo />
          <span className="font-heading text-lg font-semibold">Buqancha</span>
        </Link>
        {showSearch && (
          <div className="hidden max-w-md flex-1 md:block">
            <SearchForm />
          </div>
        )}
        <nav className="ml-auto hidden items-center gap-5 text-sm font-medium text-muted sm:flex">
          <Link href="/sotuvchilar" className="hover:text-text">
            Sotuvchilar
          </Link>
          <Link href="/hamkorlik" className="hover:text-text">
            Hamkorlik
          </Link>
        </nav>
        <div className="ml-auto sm:ml-0">
          <ThemeToggle initial={theme} />
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-5 px-4 pb-2 text-sm font-medium text-muted sm:hidden">
        <Link href="/sotuvchilar" className="hover:text-text">
          Sotuvchilar
        </Link>
        <Link href="/hamkorlik" className="hover:text-text">
          Hamkorlik
        </Link>
        {showSearch && (
          <Link href="/qidiruv" className="hover:text-text">
            Qidiruv
          </Link>
        )}
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <rect x="3" y="5" width="26" height="22" rx="6" fill="var(--accent)" />
      <path d="M9 11h6.5a3 3 0 0 1 0 6H9zm0 6h7.5a3 3 0 0 1 0 6H9z" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="23" cy="11" r="1.6" fill="var(--accent-contrast)" />
    </svg>
  );
}
