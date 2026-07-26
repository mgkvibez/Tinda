# Tinda — Migration & Bug Fix Notes

## What Changed

### Auth: Unified on Firebase (NextAuth fully removed)

- **`src/lib/auth.ts`** — `auth()` now verifies a Firebase ID token from the `__session` cookie via the Admin SDK, returning `{ user } | null`. Every API route already expected this shape.
- **`src/context/AuthContext.tsx`** — Single context (merged the orphaned root duplicate). Syncs ID token to cookie on sign-in and token refresh. Exposes `logout` + `signInWithGoogle`. Google sign-in now creates a Firestore user doc.
- **`src/proxy.ts`** — Next.js 16 middleware file (renamed from `middleware.ts`). Protects `/dashboard`, `/candidate`, `/employer`, `/admin`, and other authenticated routes.
- **Deleted:** `[...nextauth]/route.ts`, `auth/register/route.ts`, `next-auth` from package.json, `SessionProvider`, `next-auth.d.ts`, `src/lib/db.ts`, `src/lib/user-types.ts`, root-level `tinda.ts`, `user.ts`, `AuthContext.tsx`, `src/app/tinda.ts`, `src/app/user.ts`, `src/app/index.ts`, `next.config.js`.

### Bugs That Would Have Silently Broken Matching

- **`UserType`** — Was a type alias, used as `UserType.Candidate`/`UserType.Employer` (wouldn't compile). Now a real enum.
- **`src/lib/firebase.ts`** — Created the full Firestore CRUD layer (was missing entirely — every import from `@/lib/firebase` was broken).
- **`listJobs()`** — Was ignoring its filter parameter. Now properly filters by `employerId`.
- **`listCandidateUsers()`** — Was querying lowercase `'candidate'` but data is stored as `'Candidate'`. Fixed casing.
- **`listSwipesBySwiper()`** — Was dropping the document ID, so re-swipes created duplicates. Now includes `id`.
- **Swipe route** — Was reading `employerProfile.userId` (never written). Now uses the profile doc's actual ID.

### Made Functional (Were Mocked Before)

- **Forgot password** — Real `sendPasswordResetEmail` via Firebase.
- **Email verification** — Real `applyActionCode` against Firebase's `oobCode`. Signup now sends verification email.

### New Pages

- **`/dashboard`** — Role-based dashboard. Candidate sees swipe + profile links. Employer sees job management + talent discovery. Includes onboarding step for Google sign-in users (who don't have a userType yet).
- **`/employer/swipe`** — Employers can now swipe through candidate profiles (was missing entirely).

### Other Fixes

- **Login page** — Added missing `GoogleAuthProvider` and `signInWithPopup` imports.
- **Signup form** — Now creates `candidateProfiles` or `employerProfiles` docs on signup (was only creating the users doc). Reads `?type=employer` query param. Sends email verification.
- **Header** — Now auth-aware (shows Login/Signup or Dashboard/Logout).
- **`.gitignore`** — Now properly ignores `.env` files (was only ignoring `node_modules` and `.next/`).
- **`.env`** — Removed from repo (was committed to a PUBLIC repo — rotate all Firebase credentials immediately).
- **`firestore.rules`** — Rewritten with proper per-collection rules. Candidate/employer profiles and jobs are readable by all authenticated users; swipes/matches/conversations are restricted to participants.
- **`next.config.js`** — Deleted (was a duplicate of `next.config.mjs`).
- **`package.json`** — Removed `next-auth`, `bcryptjs`, and `@types/bcryptjs` (no longer needed).

## Vercel Deployment Checklist

1. Set all environment variables from `.env.example` in your Vercel project settings
2. **Rotate your Firebase credentials** — the old `.env` was public
3. Deploy Firestore rules: `firebase deploy --only firestore:rules`
4. Deploy Storage rules: `firebase deploy --only storage`
5. Deploy to Vercel
