"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth";
import { deleteAllOwnThreads, deleteOwnThreads } from "@/lib/chat-threads";

/**
 * Deleting Ask conversations (APP_UX_PROPOSAL.md §11 #11).
 *
 * Both run as the signed-in user and lean on RLS (migration 0027) for scope:
 * an id that isn't yours deletes nothing. The result is a flag, never a
 * database message, so the client can show its own sentence in the user's
 * language.
 */

export async function deleteChatThread(
  threadId: string
): Promise<{ ok: boolean }> {
  if (!(await getSessionUser())) return { ok: false };
  const ok = await deleteOwnThreads([threadId]);
  revalidatePath("/[lang]/dashboard/chat", "page");
  return { ok };
}

export async function clearChatHistory(): Promise<{ ok: boolean }> {
  if (!(await getSessionUser())) return { ok: false };
  const ok = await deleteAllOwnThreads();
  revalidatePath("/[lang]/dashboard/chat", "page");
  return { ok };
}
