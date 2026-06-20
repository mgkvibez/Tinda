import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as z from "zod";

const candidateSchema = z.object({
  fullName: z.string().max(200).nullable().optional(),
  profilePicture: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  currentRole: z.string().nullable().optional(),
  yearsOfExperience: z.number().int().nullable().optional(),
  skills: z.array(z.string()).nullable().optional(),
  education: z.array(z.string()).nullable().optional(),
  certifications: z.array(z.string()).nullable().optional(),
  languages: z.array(z.string()).nullable().optional(),
  resumeUrl: z.string().nullable().optional(),
  portfolioUrl: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  githubUrl: z.string().nullable().optional(),
  desiredSalaryMin: z.number().int().nullable().optional(),
  desiredSalaryMax: z.number().int().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json(profile ?? null);
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = candidateSchema.parse(body);

    const upserted = await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName: data.fullName || undefined,
        profilePicture: data.profilePicture || undefined,
        phone: data.phone || undefined,
        location: data.location || undefined,
        bio: data.bio || undefined,
        currentRole: data.currentRole || undefined,
        yearsOfExperience: data.yearsOfExperience || undefined,
        skills: data.skills || [],
        education: data.education || [],
        certifications: data.certifications || [],
        languages: data.languages || [],
        resumeUrl: data.resumeUrl || undefined,
        portfolioUrl: data.portfolioUrl || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        githubUrl: data.githubUrl || undefined,
        desiredSalaryMin: data.desiredSalaryMin || undefined,
        desiredSalaryMax: data.desiredSalaryMax || undefined,
      },
      update: {
        fullName: data.fullName || undefined,
        profilePicture: data.profilePicture || undefined,
        phone: data.phone || undefined,
        location: data.location || undefined,
        bio: data.bio || undefined,
        currentRole: data.currentRole || undefined,
        yearsOfExperience: data.yearsOfExperience || undefined,
        skills: data.skills || [],
        education: data.education || [],
        certifications: data.certifications || [],
        languages: data.languages || [],
        resumeUrl: data.resumeUrl || undefined,
        portfolioUrl: data.portfolioUrl || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        githubUrl: data.githubUrl || undefined,
        desiredSalaryMin: data.desiredSalaryMin || undefined,
        desiredSalaryMax: data.desiredSalaryMax || undefined,
      },
    });

    return NextResponse.json(upserted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 });
    }
    console.error("Candidate profile error:", error);
    return NextResponse.json({ message: "Failed to update profile." }, { status: 500 });
  }
}
