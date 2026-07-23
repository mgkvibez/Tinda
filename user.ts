"use server";

import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { userProfileSchema } from "@/lib/validations";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(data: unknown) {
  const user = await getAuthenticatedUser();
  const validated = userProfileSchema.parse(data);

  await adminDb.collection("users").doc(user.uid).update({
    ...validated,
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath("/dashboard");
}