import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("notes")
    // never return edit_token to the public
    .select("id, author, to_name, content, color, x, y, rotation, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const note = {
    id: body.id as string,
    // client-provided token makes POST idempotent & preserves ownership even if client misses response
    edit_token: (body.editToken as string | undefined) ?? undefined,

    author: String(body.author ?? ""),
    to_name: String(body.to_name ?? ""),
    content: String(body.content ?? ""),
    color: String(body.color ?? "#FFE5E5"),
    x: Number(body.x ?? 50),
    y: Number(body.y ?? 35),
    rotation: Number(body.rotation ?? 0),
  };

  if (!note.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!note.content.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  // Insert attempt
  const { data, error } = await supabaseAdmin
    .from("notes")
    .insert(note)
    .select("id, edit_token, author, to_name, content, color, x, y, rotation, created_at, updated_at")
    .single();

  if (!error && data) {
    return NextResponse.json({
      note: {
        id: data.id,
        author: data.author,
        to_name: data.to_name,
        content: data.content,
        color: data.color,
        x: data.x,
        y: data.y,
        rotation: data.rotation,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      editToken: data.edit_token,
    });
  }

  // If duplicate primary key, verify ownership token and return success or conflict
  // PostgREST duplicate key error code is typically 23505 (may be under error.code)
  const code = (error as any)?.code as string | undefined;
  if (code === "23505") {
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("notes")
      .select("id, edit_token, author, to_name, content, color, x, y, rotation, created_at, updated_at")
      .eq("id", note.id)
      .single();

    if (selErr || !existing) {
      return NextResponse.json({ error: "Note already exists" }, { status: 409 });
    }

    // If client token matches, treat as already-posted success
    if (note.edit_token && existing.edit_token === note.edit_token) {
      return NextResponse.json({
        note: {
          id: existing.id,
          author: existing.author,
          to_name: existing.to_name,
          content: existing.content,
          color: existing.color,
          x: existing.x,
          y: existing.y,
          rotation: existing.rotation,
          created_at: existing.created_at,
          updated_at: existing.updated_at,
        },
        editToken: existing.edit_token,
      });
    }

    return NextResponse.json({ error: "Not allowed" }, { status: 409 });
  }

  return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
}