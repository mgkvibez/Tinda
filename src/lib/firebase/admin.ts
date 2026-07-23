import "server-only";

import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { env } from "@/lib/env";

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

if (!getApps().length) {
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

  adminApp = initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    projectId: env.FIREBASE_PROJECT_ID,
  });
} else {
  adminApp = getApp();
}

adminAuth = getAuth(adminApp);
adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb };