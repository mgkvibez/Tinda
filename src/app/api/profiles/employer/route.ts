import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as z from "zod";

const employerSchema = z.object({
  companyName: z.string().max(200).nullable().optional(),
  logo: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  companySize: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  headquarters: z.string().nullable().optional(),
  aboutCompany: z.string().nullable().optional(),
  recruiterName: z.string().nullable().optional(),
  recruiterPosition: z.string().nullable().optional(),
  recruiterEmail: z.string().email().nullable().optional(),
  recruiterPhone: z.string().nullable().optional(),
  subscriptionTier: z.enum(["Free","Pro","Enterprise"]).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const profile = await prisma.employerProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json(profile ?? null);
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = employerSchema.parse(body);

    const upserted = await prisma.employerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        companyName: data.companyName || undefined,
        logo: data.logo || undefined,
        industry: data.industry || undefined,
        companySize: data.companySize || undefined,
        website: data.website || undefined,
        headquarters: data.headquarters || undefined,
        aboutCompany: data.aboutCompany || undefined,
        recruiterName: data.recruiterName || undefined,
        recruiterPosition: data.recruiterPosition || undefined,
        recruiterEmail: data.recruiterEmail || undefined,
        recruiterPhone: data.recruiterPhone || undefined,
        subscriptionTier: (data.subscriptionTier as any) || undefined,
      },
      update: {
        companyName: data.companyName || undefined,
        logo: data.logo || undefined,
        industry: data.industry || undefined,
        companySize: data.companySize || undefined,
        website: data.website || undefined,
        headquarters: data.headquarters || undefined,
        aboutCompany: data.aboutCompany || undefined,
        recruiterName: data.recruiterName || undefined,
        recruiterPosition: data.recruiterPosition || undefined,
        recruiterEmail: data.recruiterEmail || undefined,
        recruiterPhone: data.recruiterPhone || undefined,
        subscriptionTier: (data.subscriptionTier as any) || undefined,
      },
    });

    return NextResponse.json(upserted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 });
    }
    console.error("Employer profile error:", error);
    return NextResponse.json({ message: "Failed to update employer profile." }, { status: 500 });
  }
}
