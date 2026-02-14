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

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("notes")
    .select(NOTE_SELECT)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const id = String(body.id ?? "");
  const editToken = String(body.editToken ?? "");

  const xRaw = asFiniteNumber(body.x);
  const yRaw = asFiniteNumber(body.y);
  const rotRaw = asFiniteNumber(body.rotation);

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!editToken) return NextResponse.json({ error: "Missing editToken" }, { status: 400 });
  if (!String(body.content ?? "").trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (xRaw === null || yRaw === null || rotRaw === null) {
    return NextResponse.json(
      { error: "Invalid coordinates (x/y/rotation must be finite numbers)" },
      { status: 400 },
    );
  }

  // Optional music fields (null if not provided)
  const track_id = asTextOrNull(body.track_id, 64);
  const track_name = asTextOrNull(body.track_name, 200);
  const track_artists = asTextOrNull(body.track_artists, 200);
  const track_image = asTextOrNull(body.track_image, 500);
  const track_preview_url = asTextOrNull(body.track_preview_url, 500);
  const track_spotify_url = asTextOrNull(body.track_spotify_url, 500);

  const note = {
    id,
    author: String(body.author ?? ""),
    to_name: String(body.to_name ?? ""),
    content: String(body.content ?? ""),
    color: String(body.color ?? "#FFE5E5"),

    // x/y are now WORLD PIXELS (infinite canvas). Clamp only to prevent absurd values.
    x: clamp(xRaw, -200000, 200000),
    y: clamp(yRaw, -200000, 200000),

    rotation: rotRaw,

    track_id,
    track_name,
    track_artists,
    track_image,
    track_preview_url,
    track_spotify_url,
  };

  // Insert note
  const { data, error } = await supabaseAdmin
    .from("notes")
    .insert(note)
    .select(NOTE_SELECT)
    .single();

  if (!error && data) {
    // Insert token hash
    const { error: tokErr } = await supabaseAdmin.from("note_tokens").insert({
      note_id: id,
      token_hash: sha256Hex(editToken),
    });

    if (tokErr) {
      // cleanup if token insert fails
      await supabaseAdmin.from("notes").delete().eq("id", id);
      return NextResponse.json({ error: tokErr.message }, { status: 500 });
    }

    return NextResponse.json({ note: data, editToken });
  }

  // Duplicate primary key: allow idempotent success if token matches
  const code = (error as any)?.code as string | undefined;
  if (code === "23505") {
    const { data: existingTok } = await supabaseAdmin
      .from("note_tokens")
      .select("token_hash")
      .eq("note_id", id)
      .single();

    if (existingTok?.token_hash === sha256Hex(editToken)) {
      const { data: existingNote } = await supabaseAdmin
        .from("notes")
        .select(NOTE_SELECT)
        .eq("id", id)
        .single();

      return NextResponse.json({ note: existingNote, editToken });
    }

    return NextResponse.json({ error: "Not allowed" }, { status: 409 });
  }

  return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
}