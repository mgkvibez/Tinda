"use server";

import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { tindaDocSchema } from "@/lib/validations";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache"; // Centralized auth utility
import { getAuthenticatedUser } from "@/lib/auth";

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

  if (!doc.exists) {
    throw new Error("Document not found");
  }

  if (doc.data()?.ownerId !== user.uid) {
    throw new Error("Access denied: You do not have permission to update this document");
  }

  await docRef.update({
    ...validated,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Revalidate the dashboard and the specific item if necessary
  revalidatePath("/dashboard", "layout");
}