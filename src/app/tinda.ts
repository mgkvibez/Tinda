"use server";

import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { tindaDocSchema } from "@/lib/validations";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("__session")?.value;
  if (!token) throw new Error("Unauthorized");
  return adminAuth.verifyIdToken(token);
}

export async function createTindaDoc(data: unknown) {
  const user = await getAuthenticatedUser();
  const validated = tindaDocSchema.parse(data);

  const docRef = adminDb.collection("tindas").doc();
  await docRef.set({
    ...validated,
    imageUrl: validated.imageUrl || null,
    ownerId: user.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath("/dashboard");
  return { id: docRef.id };
}

export async function updateTindaDoc(id: string, data: unknown) {
  const user = await getAuthenticatedUser();
  const validated = tindaDocSchema.parse(data);

  const docRef = adminDb.collection("tindas").doc(id);
  const doc = await docRef.get();

  if (!doc.exists || doc.data()?.ownerId !== user.uid) {
    throw new Error("Forbidden");
  }

  await docRef.update({
    ...validated,
    updatedAt: FieldValue.serverTimestamp(),
  });
}