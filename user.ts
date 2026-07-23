"use server";

import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { userProfileSchema } from "@/lib/validations";
import { FieldValue } from "firebase-admin/firestore";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("__session")?.value;

  if (!token) throw new Error("Unauthorized");

  try {
    return await adminAuth.verifyIdToken(token);
  } catch (error) {
    throw new Error("Invalid session");
  }
}

export async function updateUserProfile(data: unknown) {
  const user = await getAuthenticatedUser();
  const validated = userProfileSchema.parse(data);

  await adminDb.collection("users").doc(user.uid).update({
    ...validated,
    updatedAt: FieldValue.serverTimestamp(),
  });
}