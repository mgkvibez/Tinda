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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ message: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = jobSchema.parse(body);

    const job = await prisma.job.updateMany({
      where: { id, employerId: user.id },
      data: {
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

    if (job.count === 0) {
      return NextResponse.json({ message: "Job not found or not owned by user" }, { status: 404 });
    }

    const updatedJob = await prisma.job.findUnique({ where: { id } });
    return NextResponse.json(updatedJob);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 });
    }
    console.error("Job update error:", error);
    return NextResponse.json({ message: "Failed to update job." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await prisma.job.deleteMany({ where: { id, employerId: user.id } });
  return NextResponse.json({ message: "Deleted" });
}
