import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = request.nextUrl.pathname.split("/")[1] ?? "cs";
  return NextResponse.redirect(new URL(`/${locale}`, request.url));
}
