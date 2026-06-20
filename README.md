
# Tinda — Apple Sign In Setup

This repository includes an Apple Sign In provider for NextAuth. Below are steps to configure Apple OAuth and a small helper script to generate the Apple client secret (a signed JWT).

## 1) Create an Apple Service ID and Key

- Go to Apple Developer (Certificates, Identifiers & Profiles).
- Under "Identifiers" create a new **Service ID** (this will be your `CLIENT_ID`).
- Configure the Service ID with the Sign In with Apple capability and add web domain/redirect URL (e.g. `https://your-domain.com/api/auth/callback/apple`).
- Under "Keys" create a new key with the Sign in with Apple capability; download the `.p8` private key. You will get:
  - `AuthKey_XXXXXXXXXX.p8` (the private key file)
  - `KEY ID` (visible in the Keys list)
  - `TEAM ID` (your Apple Developer team ID)

## 2) Fill `.env` values

Edit your `.env` (or environment) and set these values:

- `APPLE_CLIENT_ID` = Service ID (e.g. `com.example.web`) 
- `APPLE_CLIENT_SECRET` = (a JWT you generate using the helper below)
- `APPLE_CLIENT_KEY_ID` = the Key ID (optional usage)
- `NEXTAUTH_SECRET` = a strong random value (e.g. `openssl rand -base64 32`)

Important: `next-auth` expects `clientSecret` to be the JWT string for Apple Provider.

## 3) Generate the Apple Client Secret (JWT)

A helper script is included at `scripts/generate-apple-client-secret.mjs` that uses the `jose` package to sign the JWT.

Example command:

```bash
node scripts/generate-apple-client-secret.mjs \
  --key-file ./AuthKey.p8 \
  --team-id YOUR_TEAM_ID \
  --client-id YOUR_SERVICE_ID \
  --key-id YOUR_KEY_ID
```

This will print a long JWT string which you can paste into `APPLE_CLIENT_SECRET` in your environment.

You can also run the included npm script which forwards to the generator:

```bash
npm run gen:apple-secret -- --key-file ./AuthKey.p8 --team-id TEAM --client-id CLIENT --key-id KEY
```

To automatically write the secret into `.env` use `--write-env`:

```bash
npm run gen:apple-secret -- --key-file ./AuthKey.p8 --team-id TEAM --client-id CLIENT --key-id KEY --write-env
```

## 4) NextAuth configuration

`src/lib/auth.ts` already registers the Apple provider. Ensure your `.env` variables are set and run the app.

## 5) Testing

Run the dev server and test sign in with Apple:

```bash
npm run dev
```

Visit `/login` and choose Sign in with Apple.

If you want the helper script to output directly into your `.env`, run the script and copy-paste the JWT into `APPLE_CLIENT_SECRET`.

---
If you want, I can also add an npm script to generate the secret and optionally write it to `.env` automatically (securely). Want that next? 
