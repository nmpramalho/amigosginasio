"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/access";
import { getDatabase } from "@/lib/db";

const route = "/jogadores";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxPhotoSize = 2 * 1024 * 1024;

type Input = {
  name: string; federationNumber: string | null; contactEmail: string | null;
  mobilePhone: string | null; userId: string | null; isActive: boolean;
  photo: File | null; removePhoto: boolean;
};

function parseInput(data: FormData): Input | null {
  const name = data.get("name");
  const number = data.get("federationNumber");
  const email = data.get("contactEmail");
  const phone = data.get("mobilePhone");
  const userId = data.get("userId");
  const active = data.get("isActive");
  const photo = data.get("photo");
  if (typeof name !== "string" || typeof number !== "string" || typeof email !== "string" ||
      typeof phone !== "string" || typeof userId !== "string" ||
      !["true", "false"].includes(String(active)) || (photo !== null && !(photo instanceof File))) return null;
  const cleanName = name.trim().replace(/\s+/g, " ");
  const cleanNumber = number.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();
  if (cleanName.length < 2 || cleanName.length > 120 || cleanNumber.length > 30 ||
      cleanEmail.length > 254 || (cleanEmail && !emailPattern.test(cleanEmail)) ||
      cleanPhone.length > 25 || (cleanPhone && !/^[+0-9 ()-]{6,25}$/.test(cleanPhone)) ||
      (userId !== "" && !uuid.test(userId)) ||
      (photo instanceof File && photo.size > maxPhotoSize)) return null;
  return { name: cleanName, federationNumber: cleanNumber || null, contactEmail: cleanEmail || null,
    mobilePhone: cleanPhone || null, userId: userId || null, isActive: active === "true",
    photo: photo instanceof File && photo.size > 0 ? photo : null,
    removePhoto: data.get("removePhoto") === "true" };
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code) : undefined;
}

async function validatePhoto(file: File | null): Promise<{ bytes: Buffer; extension: string; contentType: string } | null> {
  if (!file) return null;
  if (file.size > maxPhotoSize) redirect(`${route}?status=photo-invalid`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const jpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (jpeg && file.type === "image/jpeg") return { bytes, extension: "jpg", contentType: "image/jpeg" };
  if (png && file.type === "image/png") return { bytes, extension: "png", contentType: "image/png" };
  if (webp && file.type === "image/webp") return { bytes, extension: "webp", contentType: "image/webp" };
  redirect(`${route}?status=photo-invalid`);
}

async function uploadPhoto(file: File | null): Promise<string | null> {
  const validated = await validatePhoto(file);
  if (!validated) return null;
  const result = await put(`players/${randomUUID()}.${validated.extension}`, validated.bytes,
    { access: "private", contentType: validated.contentType });
  return result.pathname;
}

async function removeBlob(key: string | null): Promise<void> {
  if (!key) return;
  try { await del(key); } catch (error) { console.error("Photo cleanup failed", error); }
}

export async function createPlayer(data: FormData): Promise<void> {
  await requireAdmin();
  const input = parseInput(data);
  if (!input) redirect(`${route}?status=invalid`);
  const sql = getDatabase();
  if (input.userId) {
    const users = await sql`SELECT id FROM public.users WHERE id = ${input.userId}::uuid AND active = true LIMIT 1`;
    if (!users.length) redirect(`${route}?status=user-invalid`);
  }
  const key = await uploadPhoto(input.photo);
  try {
    await sql`INSERT INTO public.players
      (name, federation_number, contact_email, mobile_phone, user_id, is_active, photo_key)
      VALUES (${input.name}, ${input.federationNumber}, ${input.contactEmail}, ${input.mobilePhone},
              ${input.userId}::uuid, ${input.isActive}, ${key})`;
  } catch (error) {
    await removeBlob(key);
    if (errorCode(error) === "23505") redirect(`${route}?status=duplicate`);
    if (errorCode(error) === "23503") redirect(`${route}?status=user-invalid`);
    throw error;
  }
  revalidatePath(route);
  redirect(`${route}?status=created`);
}

export async function updatePlayer(data: FormData): Promise<void> {
  await requireAdmin();
  const id = data.get("id");
  const input = parseInput(data);
  if (typeof id !== "string" || !uuid.test(id) || !input) redirect(`${route}?status=invalid`);
  const sql = getDatabase();
  const previous = await sql`SELECT photo_key FROM public.players WHERE id = ${id}::uuid LIMIT 1`;
  if (!previous.length) redirect(`${route}?status=missing`);
  if (input.userId) {
    const users = await sql`SELECT id FROM public.users WHERE id = ${input.userId}::uuid AND active = true LIMIT 1`;
    if (!users.length) redirect(`${route}?status=user-invalid`);
  }
  const oldKey = previous[0].photo_key as string | null;
  const newKey = await uploadPhoto(input.photo);
  const key = newKey ?? (input.removePhoto ? null : oldKey);
  try {
    const updated = await sql`UPDATE public.players SET name = ${input.name},
      federation_number = ${input.federationNumber}, contact_email = ${input.contactEmail},
      mobile_phone = ${input.mobilePhone}, user_id = ${input.userId}::uuid,
      is_active = ${input.isActive}, photo_key = ${key}, updated_at = now()
      WHERE id = ${id}::uuid RETURNING id`;
    if (!updated.length) { await removeBlob(newKey); redirect(`${route}?status=missing`); }
  } catch (error) {
    await removeBlob(newKey);
    if (errorCode(error) === "23505") redirect(`${route}?status=duplicate`);
    if (errorCode(error) === "23503") redirect(`${route}?status=user-invalid`);
    throw error;
  }
  if (oldKey && oldKey !== key) await removeBlob(oldKey);
  revalidatePath(route);
  redirect(`${route}?status=updated`);
}

export async function deletePlayer(data: FormData): Promise<void> {
  await requireAdmin();
  const id = data.get("id");
  if (typeof id !== "string" || !uuid.test(id)) redirect(`${route}?status=invalid`);
  const sql = getDatabase();
  try {
    const deleted = await sql`DELETE FROM public.players WHERE id = ${id}::uuid RETURNING photo_key`;
    if (!deleted.length) redirect(`${route}?status=missing`);
    await removeBlob(deleted[0].photo_key as string | null);
  } catch (error) {
    if (errorCode(error) === "23503") redirect(`${route}?status=related`);
    throw error;
  }
  revalidatePath(route);
  redirect(`${route}?status=deleted`);
}
