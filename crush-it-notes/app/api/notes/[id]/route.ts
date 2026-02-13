import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function requireValidToken(noteId: string, editToken: string | null) {
  if (!editToken) return { ok: false as const, status: 401, error: "Missing editToken" };

  const { data, error } = await supabaseAdmin
    .from("notes")
    .select("edit_token")
    .eq("id", noteId)
    .single();

  if (error) return { ok: false as const, status: 404, error: "Note not found" };
  if (data.edit_token !== editToken) return { ok: false as const, status: 403, error: "Not allowed" };

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

  // Allow only specific fields
  const allowed = ["author", "to_name", "content", "color", "x", "y", "rotation"] as const;
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in patch) update[k] = patch[k];

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