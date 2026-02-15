import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import { normalizeNoteColor } from "@/lib/noteColors";
import { normalizeRotation } from "@/lib/notePolicy";
import { getRequestIp } from "@/lib/requestIp";

const MAX_NOTES_PER_MIN_PER_IP = 6;
export const runtime = "nodejs";

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
  const ip = getRequestIp(req);

  // 1) Parse body FIRST (needed for hash + validation)
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const id = String(body.id ?? "");
  const editToken = String(body.editToken ?? "");

  const author = String(body.author ?? "");
  const to_name = String(body.to_name ?? "");
  const content = String(body.content ?? "");

  const xRaw = asFiniteNumber(body.x);
  const yRaw = asFiniteNumber(body.y);
  const rotRaw = asFiniteNumber(body.rotation);

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!editToken) return NextResponse.json({ error: "Missing editToken" }, { status: 400 });
  if (!content.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (xRaw === null || yRaw === null || rotRaw === null) {
    return NextResponse.json(
      { error: "Invalid coordinates (x/y/rotation must be finite numbers)" },
      { status: 400 },
    );
  }

  // 2) Rate limit (requires you created the SQL function/table)
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / 60000) * 60000).toISOString();

  const { data: count, error: rlErr } = await supabaseAdmin.rpc(
    "increment_note_rate_limit",
    { ip_text: ip, window_start_ts: windowStart },
  );

  if (rlErr) {
    return NextResponse.json({ error: rlErr.message }, { status: 500 });
  }
  if (typeof count === "number" && count > MAX_NOTES_PER_MIN_PER_IP) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      { status: 429 },
    );
  }

  // 3) Duplicate guard (requires created_ip + content_hash columns)
  const contentHash = crypto
    .createHash("sha256")
    .update(`${author.trim()}|${to_name.trim()}|${content.trim()}`)
    .digest("hex");

  const sinceIso = new Date(Date.now() - 30_000).toISOString();
  const { data: dup, error: dupErr } = await supabaseAdmin
    .from("notes")
    .select("id")
    .eq("created_ip", ip)
    .eq("content_hash", contentHash)
    .gte("created_at", sinceIso)
    .limit(1);

  // If these columns don't exist yet, Supabase returns an error. Treat as server misconfig.
  if (dupErr) {
    return NextResponse.json({ error: dupErr.message }, { status: 500 });
  }

  if ((dup?.length ?? 0) > 0) {
    return NextResponse.json(
      { error: "Duplicate detected. Please wait before posting the same message again." },
      { status: 429 },
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
    author,
    to_name,
    content,
    color: normalizeNoteColor(body.color),
    x: clamp(xRaw, -200000, 200000),
    y: clamp(yRaw, -200000, 200000),
    rotation: normalizeRotation(rotRaw),

    created_ip: ip,
    content_hash: contentHash,

    track_id,
    track_name,
    track_artists,
    track_image,
    track_preview_url,
    track_spotify_url,
  };

  const { data, error } = await supabaseAdmin
    .from("notes")
    .insert(note)
    .select(NOTE_SELECT)
    .single();

  if (!error && data) {
    const { error: tokErr } = await supabaseAdmin.from("note_tokens").insert({
      note_id: id,
      token_hash: sha256Hex(editToken),
    });

    if (tokErr) {
      await supabaseAdmin.from("notes").delete().eq("id", id);
      return NextResponse.json({ error: tokErr.message }, { status: 500 });
    }

    return NextResponse.json({ note: data, editToken });
  }

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