import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { UserType } from "@prisma/client";
import * as z from "zod";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  userType: z.enum(["Candidate", "Employer"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, userType } = signupSchema.parse(body);

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { message: "Database connection is not configured. Please set DATABASE_URL." },
        { status: 500 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists." }, { status: 409 });
    }

    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        userType,
      },
    });

    // Create corresponding profile based on userType
    if (userType === UserType.Candidate) {
      await prisma.candidateProfile.create({
        data: {
          userId: user.id,
          fullName: name,
        },
      });
    } else if (userType === UserType.Employer) {
      await prisma.employerProfile.create({
        data: {
          userId: user.id,
          recruiterName: name,
        },
      });
    }

    // In a real app, you'd send a verification email here
    // using Resend or similar service.

    return NextResponse.json({ message: "User registered successfully." }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? "Invalid registration data." }, { status: 400 });
    }

    const message = process.env.NODE_ENV === "production"
      ? "Something went wrong."
      : error instanceof Error
      ? error.message
      : "Unknown error.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
