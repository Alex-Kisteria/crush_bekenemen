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

function asTextOrNull(v: unknown, maxLen: number) {
  if (v === null || v === undefined) return null;
  const s = String(v);
  if (!s.trim()) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

const NOTE_SELECT =
  "id, author, to_name, content, color, x, y, rotation, track_id, track_name, track_artists, track_image, track_preview_url, track_spotify_url, created_at, updated_at";

async function tokenOk(noteId: string, editToken: string) {
  const { data: tokenRow } = await supabaseAdmin
    .from("note_tokens")
    .select("token_hash")
    .eq("note_id", noteId)
    .single();

  return !!tokenRow && tokenRow.token_hash === sha256Hex(editToken);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("notes")
    .select(NOTE_SELECT)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ note: data });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const editToken = String(body.editToken ?? "");
  if (!editToken) return NextResponse.json({ error: "Missing editToken" }, { status: 400 });

  // Accept BOTH payload shapes:
  //  A) { editToken, patch: { x, y } }
  //  B) { editToken, x, y }
  const patch: Record<string, unknown> =
    body.patch && typeof body.patch === "object" ? (body.patch as Record<string, unknown>) : body;

  if (!(await tokenOk(id, editToken))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const update: Record<string, unknown> = {};

  if ("content" in patch) update.content = asTextOrNull(patch.content, 2000);
  if ("author" in patch) update.author = asTextOrNull(patch.author, 120);
  if ("to_name" in patch) update.to_name = asTextOrNull(patch.to_name, 120);
  if ("color" in patch) update.color = String(patch.color ?? "#FFE5E5");

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

  // Music fields
  if ("track_id" in patch) update.track_id = asTextOrNull(patch.track_id, 64);
  if ("track_name" in patch) update.track_name = asTextOrNull(patch.track_name, 200);
  if ("track_artists" in patch) update.track_artists = asTextOrNull(patch.track_artists, 200);
  if ("track_image" in patch) update.track_image = asTextOrNull(patch.track_image, 500);
  if ("track_preview_url" in patch) update.track_preview_url = asTextOrNull(patch.track_preview_url, 500);
  if ("track_spotify_url" in patch) update.track_spotify_url = asTextOrNull(patch.track_spotify_url, 500);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("notes")
    .update(update)
    .eq("id", id)
    .select(NOTE_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Your frontend calls: /api/notes/:id?editToken=...
  const { searchParams } = new URL(req.url);
  const editToken = String(searchParams.get("editToken") ?? "");

  if (!editToken) return NextResponse.json({ error: "Missing editToken" }, { status: 400 });
  if (!(await tokenOk(id, editToken))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from("notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}