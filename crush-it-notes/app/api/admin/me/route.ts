import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookie, isValidAdminCookieValue } from "@/lib/adminSession";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const value = cookieStore.get(adminCookie.name)?.value;
  return NextResponse.json({ isAdmin: isValidAdminCookieValue(value) });
}