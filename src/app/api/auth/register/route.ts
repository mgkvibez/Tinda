import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { createUser, getUserByEmail, upsertCandidateProfile, upsertEmployerProfile, UserType } from "@/lib/firebase";
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

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists." }, { status: 409 });
    }

    const hashedPassword = await hash(password, 12);

    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      userType: userType as UserType,
    });

    if (userType === UserType.Candidate) {
      await upsertCandidateProfile(user.id, { fullName: name });
    } else if (userType === UserType.Employer) {
      await upsertEmployerProfile(user.id, { recruiterName: name });
    }

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
