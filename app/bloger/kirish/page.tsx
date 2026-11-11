import { redirect } from "next/navigation";
import { currentPromoter, promoterByToken, promoterCabinetEnabled } from "@/lib/promoter/auth";
import { PARTNER_TELEGRAM } from "@/lib/site";
import { promoterLogin } from "../actions";
import { Button, Flash, PageTitle } from "../../admin/ui";

type SP = Promise<{ k?: string; ok?: string; xato?: string }>;

export default async function PromoterLoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  if (!sp.k && (await currentPromoter())) redirect("/bloger");
  // havola ochilganda darhol kirilmaydi (Telegram/Instagram oldindan ko'rishi ham GET qiladi) — tugma bosiladi
  const p = sp.k ? await promoterByToken(sp.k) : null;
  return (
    <div className="mx-auto max-w-md">
      <PageTitle>Bloger kabineti</PageTitle>
      <Flash sp={sp} />
      {!promoterCabinetEnabled() ? (
        <p className="card p-5 text-sm text-muted">Kabinet hozircha yoqilmagan.</p>
      ) : p ? (
        <form action={promoterLogin} className="card grid gap-4 p-5">
          <input type="hidden" name="k" value={sp.k} />
          <p>
            <span className="text-muted">Instagram:</span> <b>@{p.instagram}</b>
          </p>
          <p className="text-sm text-muted">
            Kabinetda tavsiya qiladigan kitoblaringizni qo&apos;shasiz va sahifangizdagi ma&apos;lumotni o&apos;zgartirasiz. Havolani
            boshqalarga bermang — u parol vazifasini bajaradi.
          </p>
          <Button>Kabinetga kirish</Button>
        </form>
      ) : (
        <div className="card grid gap-3 p-5 text-sm">
          {sp.k && <p className="text-warn-text">Havola eskirgan yoki noto&apos;g&apos;ri.</p>}
          <p>Kabinetga kirish havolasini Buqanchadan olasiz. Kitob targ&apos;ibotchisi bo&apos;lmoqchi bo&apos;lsangiz, yozing:</p>
          <a href={`https://t.me/${PARTNER_TELEGRAM}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline">
            Telegram: @{PARTNER_TELEGRAM}
          </a>
        </div>
      )}
    </div>
  );
}
