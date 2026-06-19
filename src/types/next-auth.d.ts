import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { UserType } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      userType: UserType;
    } & DefaultSession["user"];
  }

  interface User {
    userType: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userType: UserType;
  }
}
