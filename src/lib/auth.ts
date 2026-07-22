import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getUserByEmail, UserType } from "@/lib/firebase";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password.");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await getUserByEmail(email);

        if (!user) {
          throw new Error("No user found with this email.");
        }

        const passwordMatch = await compare(password, user.password || "");

        if (!passwordMatch) {
          throw new Error("Invalid password.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.userType = (user as any).userType ?? UserType.Candidate;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        (session.user as any).id = token.id;
        (session.user as any).userType = token.userType;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { auth, handlers, signIn, signOut } = NextAuth(authOptions);
