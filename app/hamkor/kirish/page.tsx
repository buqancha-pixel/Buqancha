import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPartner, partnerEnabled, sellerByToken } from "@/lib/partner/auth";
import { PARTNER_TELEGRAM } from "@/lib/site";
import { partnerLogin } from "../actions";
import { Button, Flash, PageTitle } from "../../admin/ui";

type SP = Promise<{ k?: string; ok?: string; xato?: string }>;

export default async function PartnerLoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  if (!sp.k && (await currentPartner())) redirect("/hamkor");
  // havola ochilganda darhol kirilmaydi (Telegram oldindan ko'rishi ham GET qiladi) — tugma bosiladi
  const seller = sp.k ? await sellerByToken(sp.k) : null;
  return (
    <div className="mx-auto max-w-md">
      <PageTitle>Hamkor kabineti</PageTitle>
      <Flash sp={sp} />
      {!partnerEnabled() ? (
        <p className="card p-5 text-sm text-muted">Kabinet hozircha yoqilmagan.</p>
      ) : seller ? (
        <form action={partnerLogin} className="card grid gap-4 p-5">
          <input type="hidden" name="k" value={sp.k} />
          <p>
            <span className="text-muted">Do&apos;kon:</span> <b>{seller.name}</b>
          </p>
          <p className="text-sm text-muted">
            Kabinetda narxlaringizni yangilaysiz, yangi kitob qo&apos;shasiz va fayl yuklaysiz. Havolani boshqalarga bermang — u parol vazifasini bajaradi.
          </p>
          <Button>Kabinetga kirish</Button>
        </form>
      ) : (
        <div className="card grid gap-3 p-5 text-sm">
          {sp.k && <p className="text-warn-text">Havola eskirgan yoki noto&apos;g&apos;ri.</p>}
          <p>Kabinetga kirish havolasini Buqanchadan olasiz. Do&apos;koningiz yoki nashriyotingiz narxlarini qo&apos;shmoqchi bo&apos;lsangiz, yozing:</p>
          <a href={`https://t.me/${PARTNER_TELEGRAM}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline">
            Telegram: @{PARTNER_TELEGRAM}
          </a>
          <Link href="/hamkorlik" className="text-muted underline">Hamkorlik shartlari</Link>
        </div>
      )}
    </div>
  );
}
