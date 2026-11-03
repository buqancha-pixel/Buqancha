import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="font-heading text-base text-text">Buqancha</p>
          <p className="mt-2 max-w-sm">
            O'zbekistondagi kitob do'konlari, nashriyotlar va marketpleyslarda bir kitobning narxini solishtiring.
          </p>
          <p className="mt-3 max-w-sm text-xs">
            Narxlar hamkor feed'lari va sotuvchi sahifalaridan yig'iladi; namunaviy narxlar alohida belgilangan. Sotib
            olishdan oldin narxni sotuvchi saytida tekshiring.
          </p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Sayt bo'limlari">
          <Link href="/" className="hover:text-text">Bosh sahifa</Link>
          <Link href="/qidiruv" className="hover:text-text">Qidiruv</Link>
          <Link href="/sotuvchilar" className="hover:text-text">Sotuvchilar</Link>
        </nav>
        <nav className="flex flex-col gap-2" aria-label="Hamkorlar uchun">
          <Link href="/hamkorlik" className="hover:text-text">Hamkor bo'lish</Link>
        </nav>
      </div>
    </footer>
  );
}
