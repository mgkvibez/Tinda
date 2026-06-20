import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as z from "zod";

const jobSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  responsibilities: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  salaryRangeMin: z.number().int().nullable().optional(),
  salaryRangeMax: z.number().int().nullable().optional(),
  location: z.string().nullable().optional(),
  workArrangement: z.enum(["Remote", "Hybrid", "Onsite"]).optional(),
  employmentType: z.enum(["FullTime", "PartTime", "Contract", "Internship"]).optional(),
  experienceLevel: z.string().nullable().optional(),
  skillsRequired: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  expiryDate: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const employerId = url.searchParams.get("employerId");
  const filter: any = {};

  if (employerId) {
    filter.employerId = employerId;
  }

  const jobs = await prisma.job.findMany({ where: filter, orderBy: { createdAt: "desc" } });
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = jobSchema.parse(body);

    const candidateUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!candidateUser) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const job = await prisma.job.create({
      data: {
        employerId: user.id,
        title: data.title,
        description: data.description,
        responsibilities: data.responsibilities || [],
        requirements: data.requirements || [],
        salaryRangeMin: data.salaryRangeMin || undefined,
        salaryRangeMax: data.salaryRangeMax || undefined,
        location: data.location || undefined,
        workArrangement: data.workArrangement || undefined,
        employmentType: data.employmentType || undefined,
        experienceLevel: data.experienceLevel || undefined,
        skillsRequired: data.skillsRequired || [],
        benefits: data.benefits || [],
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 });
    }
    console.error("Job creation error:", error);
    return NextResponse.json({ message: "Failed to create job." }, { status: 500 });
  }
}
