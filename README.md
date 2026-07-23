# Tinda

Tinda is a Next.js app that uses Firebase Firestore for persistence and NextAuth for authentication.

## Tech stack

- Next.js
- Firebase Admin SDK + Firestore
- NextAuth credentials auth
- Tailwind CSS

## Firebase setup

### 1) Create a Firebase project

1. Go to the Firebase console.
2. Create a new project.
3. Enable Firestore Database.
4. Enable Authentication and leave the default providers enabled for development.

### 2) Generate service account credentials

1. Open Project Settings.
2. Go to Service accounts.
3. Generate a new private key.
4. Copy the values for:
   - `project_id`
   - `client_email`
   - `private_key`

### 3) Configure environment variables

Create or update your `.env` file with the following values:

```env
NEXTAUTH_SECRET=your-strong-secret
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

> The `FIREBASE_PRIVATE_KEY` value must include the full private key and preserve the newlines exactly.

### 4) Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and use the app.

## Notes

- The app now uses Firestore instead of Prisma.
- Authentication is handled through NextAuth with credentials-based sign-in.
- If you deploy to Vercel, add the same Firebase environment variables in the Vercel dashboard.
