import { supabase } from "./supabase";
import { CreateThesisInput, ThesisPost } from "@/types";

export type AuthResult =
  | { ok: true; userId: string; email: string; mode: "supabase" }
  | { ok: false; message: string };

export async function signInOrSignUpWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured. Using local demo mode instead." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const signIn = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

  if (signIn.data.user) {
    await ensureProfile(signIn.data.user.id, normalizedEmail);
    return { ok: true, userId: signIn.data.user.id, email: normalizedEmail, mode: "supabase" };
  }

  const signUp = await supabase.auth.signUp({ email: normalizedEmail, password });
  if (signUp.data.user) {
    await ensureProfile(signUp.data.user.id, normalizedEmail);
    return { ok: true, userId: signUp.data.user.id, email: normalizedEmail, mode: "supabase" };
  }

  return { ok: false, message: signIn.error?.message ?? signUp.error?.message ?? "Authentication failed." };
}

export async function signOutFromSupabase(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function persistThesisToSupabase(input: CreateThesisInput): Promise<void> {
  if (!supabase) return;
  const user = await supabase.auth.getUser();
  const authorId = user.data.user?.id;
  if (!authorId) return;

  await supabase.from("posts").insert({
    author_id: authorId,
    symbol: input.symbol,
    stance: input.stance,
    horizon: input.horizon,
    title: input.title,
    body: input.body,
    locked: true
  });
}

export async function persistEngagementToSupabase(
  postId: string,
  kind: "likes" | "bookmarks",
  enabled: boolean
): Promise<void> {
  if (!supabase || postId.startsWith("local-")) return;
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;
  if (!userId) return;

  if (enabled) {
    await supabase.from(kind).insert({ post_id: postId, user_id: userId });
  } else {
    await supabase.from(kind).delete().match({ post_id: postId, user_id: userId });
  }
}

export async function fetchPersistedPosts(): Promise<ThesisPost[]> {
  // The MVP keeps the public demo seeded. This adapter is intentionally ready
  // for Supabase-backed feeds without making the static demo depend on it.
  return [];
}

async function ensureProfile(userId: string, email: string): Promise<void> {
  if (!supabase) return;
  const handle = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 24) || "finsight_user";

  await supabase.from("users").upsert({
    id: userId,
    handle,
    display_name: handle,
    bio: "Building a public track record on FinSight."
  });
}
