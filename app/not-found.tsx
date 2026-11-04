import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-20 text-center">
      <p className="font-heading text-6xl text-accent">404</p>
      <h1 className="mt-4 text-2xl">Sahifa topilmadi</h1>
      <p className="mt-2 text-muted">Balki kitobni qidirib ko'rarsiz?</p>
      <div className="mt-6 w-full"><SearchForm size="lg" /></div>
      <Link href="/" className="mt-6 text-sm font-semibold text-accent hover:underline">Bosh sahifaga qaytish</Link>
    </div>
  );
}
