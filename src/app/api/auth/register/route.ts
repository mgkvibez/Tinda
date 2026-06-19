import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { UserType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const { name, email, password, userType } = await request.json();

    // Validate userType
    if (!Object.values(UserType).includes(userType)) {
      return NextResponse.json({ message: "Invalid user type provided." }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists." }, { status: 409 });
    }

    // Hash password
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
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
