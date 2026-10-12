import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { setMarketingOptIn } from "@/lib/marketing";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Volba z registrace („nechci novinky") sem dorazí v metadatech účtu.
    // Profil vzniká až teď, proto se přepisuje až po potvrzení adresy.
    const user = data?.user;
    const optIn = user?.user_metadata?.marketing_opt_in;
    if (user && optIn === false) {
      try {
        await setMarketingOptIn(user.id, false);
      } catch (err) {
        // Nepodařilo se uložit volbu → radši pustit uživatele dál než shodit přihlášení
        console.error("marketing opt-in:", err instanceof Error ? err.message : err);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
