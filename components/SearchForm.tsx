type Props = { defaultValue?: string; size?: "lg" | "md"; autoFocus?: boolean };

/** Oddiy GET forma — JavaScript'siz ham ishlaydi. */
export function SearchForm({ defaultValue = "", size = "md", autoFocus }: Props) {
  const lg = size === "lg";
  return (
    <form action="/qidiruv" method="get" role="search" className="w-full">
      <label htmlFor={`q-${size}`} className="sr-only">
        Kitob nomi yoki muallif
      </label>
      <div
        className={`flex items-center gap-2 rounded-full border border-border bg-surface shadow-card focus-within:border-accent ${
          lg ? "p-1.5 pl-5" : "p-1 pl-4"
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className={`${lg ? "size-5" : "size-4"} shrink-0 text-muted`}>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="m20 20-4.2-4.2M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z"
          />
        </svg>
        <input
          id={`q-${size}`}
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={lg ? "Masalan: O'tkan kunlar" : "Kitob yoki muallif"}
          className={`min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted ${
            lg ? "py-2.5 text-base sm:text-lg" : "py-1.5 text-sm"
          }`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-full bg-accent font-semibold text-accent-contrast transition-opacity hover:opacity-90 ${
            lg ? "px-5 py-3 text-sm sm:px-7 sm:text-base" : "px-4 py-2 text-sm"
          }`}
        >
          Qidirish
        </button>
      </div>
    </form>
  );
}
