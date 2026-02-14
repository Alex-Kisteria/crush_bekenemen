// import { NextResponse } from "next/server";
// import { adminCookie, makeAdminCookieValue } from "@/lib/adminSession";

// export async function POST(req: Request) {
//   const body = await req.json().catch(() => null);
//   const password = String(body?.password ?? "");

//   const expected = process.env.ADMIN_PASSWORD;
//   if (!expected) return NextResponse.json({ error: "Missing ADMIN_PASSWORD" }, { status: 500 });

//   if (!password || password !== expected) {
//     return NextResponse.json({ error: "Invalid password" }, { status: 401 });
//   }

//   const res = NextResponse.json({ ok: true });
//   res.cookies.set(adminCookie.name, makeAdminCookieValue(), {
//     httpOnly: true,
//     sameSite: "lax",
//     secure: process.env.NODE_ENV === "production",
//     path: "/",
//     maxAge: adminCookie.maxAge,
//   });

//   return res;
// }