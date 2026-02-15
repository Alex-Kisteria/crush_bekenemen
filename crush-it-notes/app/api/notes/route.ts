import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import { getRequestIp } from "@/lib/requestIp";
import { ALLOWED_NOTE_COLORS, DEFAULT_NOTE_COLOR } from "@/lib/noteColors";
import { NOTE_ROTATION_MIN, NOTE_ROTATION_MAX } from "@/lib/notePolicy";

export const runtime = "nodejs";

// Tune these
const MAX_NOTES_PER_MIN_PER_IP = 6;
const MAX_NOTES_PER_MIN_GLOBAL = 6;

const NOTE_SELECT =
  "id, author, to_name, content, color, x, y, rotation, track_id, track_name, track_artists, track_image, track_preview_url, track_spotify_url, created_at, updated_at";

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

const ALLOWED_COLOR_SET = new Set<string>(ALLOWED_NOTE_COLORS as readonly string[]);
function normalizeNoteColor(input: unknown) {
  if (typeof input !== "string") return DEFAULT_NOTE_COLOR;
  const s = input.trim();
  return ALLOWED_COLOR_SET.has(s) ? s : DEFAULT_NOTE_COLOR;
}

function normalizeRotation(input: unknown) {
  const n = typeof input === "string" ? Number(input) : (input as number);
  if (!Number.isFinite(n)) return 0;
  return clamp(n, NOTE_ROTATION_MIN, NOTE_ROTATION_MAX);
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("notes")
    .select(NOTE_SELECT)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: Request) {
  const ipRaw = getRequestIp(req);
  const ip = ipRaw && ipRaw !== "unknown" ? ipRaw : "__unknown__";

  // Parse body first
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const id = String(body.id ?? "").trim();
  const editToken = String(body.editToken ?? "").trim();

  // Basic sanity checks
  if (!id || id.length > 100) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (!editToken || editToken.length > 300) {
    return NextResponse.json({ error: "Invalid editToken" }, { status: 400 });
  }

  const author = asTextOrNull(body.author, 120) ?? "";
  const to_name = asTextOrNull(body.to_name, 120) ?? "";
  const content = asTextOrNull(body.content, 2000) ?? "";

  if (!content.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const xRaw = asFiniteNumber(body.x);
  const yRaw = asFiniteNumber(body.y);
  const rotRaw = asFiniteNumber(body.rotation);

  if (xRaw === null || yRaw === null || rotRaw === null) {
    return NextResponse.json(
      { error: "Invalid coordinates (x/y/rotation must be finite numbers)" },
      { status: 400 },
    );
  }

  // Per-minute window key
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / 60000) * 60000).toISOString();

  // Global limiter (helps against rotating IPs)
  const { data: globalCount, error: globalErr } = await supabaseAdmin.rpc(
    "increment_note_rate_limit",
    { ip_text: "__global__", window_start_ts: windowStart },
  );

  if (globalErr) {
    return NextResponse.json({ error: globalErr.message }, { status: 500 });
  }
  if (typeof globalCount === "number" && globalCount > MAX_NOTES_PER_MIN_GLOBAL) {
    return NextResponse.json(
      { error: "Posting is temporarily busy. Please try again later." },
      { status: 429 },
    );
  }

  // Per-IP limiter
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

  // Duplicate guard (requires notes.created_ip + notes.content_hash columns)
  const contentHash = crypto
    .createHash("sha256")
    .update(`${author.trim()}|${to_name.trim()}|${content.trim()}`)
    .digest("hex");

  // Global duplicate window (prevents repost flood across rotating IPs)
  {
    const globalSinceIso = new Date(Date.now() - 15_000).toISOString();
    const { data: globalDup, error: globalDupErr } = await supabaseAdmin
      .from("notes")
      .select("id")
      .eq("content_hash", contentHash)
      .gte("created_at", globalSinceIso)
      .limit(1);

    if (globalDupErr) {
      return NextResponse.json({ error: globalDupErr.message }, { status: 500 });
    }
    if ((globalDup?.length ?? 0) > 0) {
      return NextResponse.json(
        { error: "Duplicate detected. Please wait a bit before reposting." },
        { status: 429 },
      );
    }
  }

  // Per-IP duplicate window (additional protection)
  {
    const sinceIso = new Date(Date.now() - 30_000).toISOString();
    const { data: dup, error: dupErr } = await supabaseAdmin
      .from("notes")
      .select("id")
      .eq("created_ip", ipRaw) // store the raw IP string (can be "unknown")
      .eq("content_hash", contentHash)
      .gte("created_at", sinceIso)
      .limit(1);

    if (dupErr) {
      return NextResponse.json({ error: dupErr.message }, { status: 500 });
    }
    if ((dup?.length ?? 0) > 0) {
      return NextResponse.json(
        { error: "Duplicate detected. Please wait before posting the same message again." },
        { status: 429 },
      );
    }
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

    created_ip: ipRaw,
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

  // Handle id collisions:
  // if note id already exists AND the editToken matches, return existing.
  const code = (error as any)?.code as string | undefined;
  if (code === "23505") {
    const { data: existingTok, error: tokSelErr } = await supabaseAdmin
      .from("note_tokens")
      .select("token_hash")
      .eq("note_id", id)
      .single();

    if (tokSelErr) {
      return NextResponse.json({ error: tokSelErr.message }, { status: 500 });
    }

    if (existingTok?.token_hash === sha256Hex(editToken)) {
      const { data: existingNote, error: noteSelErr } = await supabaseAdmin
        .from("notes")
        .select(NOTE_SELECT)
        .eq("id", id)
        .single();

      if (noteSelErr) {
        return NextResponse.json({ error: noteSelErr.message }, { status: 500 });
      }

      return NextResponse.json({ note: existingNote, editToken });
    }

    return NextResponse.json({ error: "Not allowed" }, { status: 409 });
  }

  return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
}