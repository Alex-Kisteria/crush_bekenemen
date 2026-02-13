import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

function asFiniteNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function requireValidToken(noteId: string, editToken: string | null) {
  if (!editToken) return { ok: false as const, status: 401, error: "Missing editToken" };

  const { data, error } = await supabaseAdmin
    .from("note_tokens")
    .select("token_hash")
    .eq("note_id", noteId)
    .single();

  if (error) return { ok: false as const, status: 404, error: "Note not found" };
  if (data.token_hash !== sha256Hex(editToken))
    return { ok: false as const, status: 403, error: "Not allowed" };

  return { ok: true as const };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const editToken = (body.editToken ?? null) as string | null;
  const patch = (body.patch ?? {}) as Record<string, unknown>;

  const auth = await requireValidToken(id, editToken);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const update: Record<string, unknown> = {};

  if ("author" in patch) update.author = String(patch.author ?? "");
  if ("to_name" in patch) update.to_name = String(patch.to_name ?? "");
  if ("content" in patch) update.content = String(patch.content ?? "");
  if ("color" in patch) update.color = String(patch.color ?? "");

  if ("x" in patch) {
    const x = asFiniteNumber(patch.x);
    if (x === null) return NextResponse.json({ error: "Invalid x" }, { status: 400 });
    update.x = clamp(x, 0, 95);
  }

  if ("y" in patch) {
    const y = asFiniteNumber(patch.y);
    if (y === null) return NextResponse.json({ error: "Invalid y" }, { status: 400 });
    update.y = clamp(y, 0, 95);
  }

  if ("rotation" in patch) {
    const r = asFiniteNumber(patch.rotation);
    if (r === null) return NextResponse.json({ error: "Invalid rotation" }, { status: 400 });
    update.rotation = r;
  }

  const { error } = await supabaseAdmin.from("notes").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { searchParams } = new URL(req.url);
  const editToken = searchParams.get("editToken");

  const auth = await requireValidToken(id, editToken);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabaseAdmin.from("notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}