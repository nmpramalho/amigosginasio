"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { disconnectChannel } from "@/lib/youtube-channel";
export async function disconnectYouTube(): Promise<void> {
  await requireAdmin();
  await disconnectChannel();
  revalidatePath("/tv");
  revalidatePath("/dashboard");
  revalidatePath("/administracao/youtube");
  redirect("/administracao/youtube?status=disconnected");
}
