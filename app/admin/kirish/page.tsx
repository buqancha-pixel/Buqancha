import { redirect } from "next/navigation";
import { adminEnabled, isAdmin } from "@/lib/admin/auth";
import { login } from "../actions";
import { Button, Field, Flash, PageTitle, type SP } from "../ui";

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  if (await isAdmin()) redirect("/admin");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <PageTitle>Boshqaruvga kirish</PageTitle>
      {!adminEnabled() ? (
        <p className="card p-5 text-sm text-muted">
          Admin panel hali yoqilmagan. Vercel → Settings → Environment Variables bo&apos;limida <code>ADMIN_PASSWORD</code>{" "}
          (kamida 8 belgi) qo&apos;shing va saytni qayta deploy qiling.
        </p>
      ) : (
        <form action={login} className="card grid gap-4 p-5">
          <Flash sp={sp} />
          <Field label="Parol" name="password" type="password" autoComplete="current-password" required autoFocus />
          <Button>Kirish</Button>
        </form>
      )}
    </div>
  );
}
