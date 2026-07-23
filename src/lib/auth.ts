import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * Shared utility to get and verify the authenticated user from the session cookie.
 */
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("__session")?.value;

  if (!token) throw new Error("Unauthorized");

  try {
    return await adminAuth.verifyIdToken(token);
  } catch (error) {
    throw new Error("Invalid session");
  }
}