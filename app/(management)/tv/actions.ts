"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { refreshTv } from "@/lib/club-tv";

export async function forceTvCheck(): Promise<void> {
  await requireAdmin();
  const result = await refreshTv(true);
  revalidatePath("/tv");
  revalidatePath("/dashboard");
  redirect(`/tv?status=${result.status}`);
}
