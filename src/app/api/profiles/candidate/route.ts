import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCandidateProfile, upsertCandidateProfile } from "@/lib/firebase";
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

export async function GET(request: Request) {
  const session = await auth(request);
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const profile = await getCandidateProfile(user.id);
  return NextResponse.json(profile ?? null);
}

export async function PUT(request: Request) {
  const session = await auth(request);
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = candidateSchema.parse(body);

    const upserted = await upsertCandidateProfile(user.id, {
      fullName: data.fullName ?? null,
      profilePicture: data.profilePicture ?? null,
      phone: data.phone ?? null,
      location: data.location ?? null,
      bio: data.bio ?? null,
      currentRole: data.currentRole ?? null,
      yearsOfExperience: data.yearsOfExperience ?? null,
      skills: data.skills || [],
      education: data.education || [],
      certifications: data.certifications || [],
      languages: data.languages || [],
      resumeUrl: data.resumeUrl ?? null,
      portfolioUrl: data.portfolioUrl ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      githubUrl: data.githubUrl ?? null,
      desiredSalaryMin: data.desiredSalaryMin ?? null,
      desiredSalaryMax: data.desiredSalaryMax ?? null,
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
