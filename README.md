# Tinda - Swipe your way to the perfect job or discover top talent with intelligent matching.

## Live Demo
[Insert Live URL Here]

## Features
- **Pure Firebase Auth**: Secure Email/Password and Google Social Login.
- **Swipe Logic**: Intuitive matching interface for both Candidates and Employers.
- **Real-time Matching**: Instant match creation and automated conversation initialization.
- **Role-based Dashboards**: Specialized views for managing job applications and talent discovery.
- **Secure File Storage**: Firebase Storage integration for resumes, profile pictures, and company logos.
- **Serverless Architecture**: Utilizes Next.js 15 Server Actions for secure, type-safe database operations.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **File Storage**: Firebase Storage
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod + React Hook Form
- **Type Safety**: TypeScript Strict

## Firestore Structure

### `users`
- `uid`: string (Document ID)
- `email`: string
- `name`: string
- `userType`: "Candidate" | "Employer"
- `ownerId`: string
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `candidateProfiles`
- `userId`: string (Reference to users.uid)
- `fullName`: string
- `profilePicture`: string (Storage URL)
- `skills`: string[]
- `bio`: string

### `employerProfiles`
- `userId`: string (Reference to users.uid)
- `companyName`: string
- `logo`: string (Storage URL)
-
### `jobs`
- `employerId`: string
- `title`: string
- `description`: string
- `isPublished`: boolean
- `isArchived`: boolean

### `swipes`
- `swiperId`: string (UID of user swiping)
- `targetId`: string (UID or Job ID being swiped)
- `isLike`: boolean
- `targetJobId`: string (Optional reference for candidates swiping specific jobs)

## Firebase Setup

1. **Create a Firebase Project**: Start a new project at the Firebase Console.
2. **Enable Services**:
   - **Authentication**: Enable Email/Password and Google providers.
   - **Firestore Database**: Initialize in production mode.
   - **Firebase Storage**: Initialize for handling file uploads.
3. **Generate Service Account**:
   - Project Settings > Service Accounts > Generate New Private Key.
   - Note the `project_id`, `client_email`, and `private_key`.
4. **Configure Environment Variables**:
   Create a `.env.local` file with the following:
   ```env
   # Server-side (Firebase Admin SDK)
   FIREBASE_PROJECT_ID="..."
   FIREBASE_CLIENT_EMAIL="..."
   FIREBASE_PRIVATE_KEY="..."

   # Client-side (Firebase SDK)
   NEXT_PUBLIC_FIREBASE_API_KEY="..."
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
   NEXT_PUBLIC_FIREBASE_APP_ID="..."
   ```
5. **Deploy Security Rules**:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

## Run Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```
