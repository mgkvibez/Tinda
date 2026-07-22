import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteJob, getEmployerProfile, getJobById, updateJob, UserType } from "@/lib/firebase";
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
  const job = await getJobById(id);
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
    if (user.userType !== UserType.Employer) {
      return NextResponse.json({ message: "Only employers can update jobs." }, { status: 403 });
    }

    const employerProfile = await getEmployerProfile(user.id);
    if (!employerProfile) return NextResponse.json({ message: "Employer profile not found" }, { status: 404 });

    const body = await request.json();
    const data = jobSchema.parse(body);

    const existingJob = await getJobById(id);
    if (!existingJob || existingJob.employerId !== employerProfile.id) {
      return NextResponse.json({ message: "Job not found or not owned by user" }, { status: 404 });
    }

    const updatedJob = await updateJob(id, {
      title: data.title,
      description: data.description,
      responsibilities: data.responsibilities || [],
      requirements: data.requirements || [],
      salaryRangeMin: data.salaryRangeMin ?? null,
      salaryRangeMax: data.salaryRangeMax ?? null,
      location: data.location ?? null,
      workArrangement: data.workArrangement ?? null,
      employmentType: data.employmentType ?? null,
      experienceLevel: data.experienceLevel ?? null,
      skillsRequired: data.skillsRequired || [],
      benefits: data.benefits || [],
      expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : null,
    });

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

  if (user.userType !== UserType.Employer) {
    return NextResponse.json({ message: "Only employers can delete jobs." }, { status: 403 });
  }

  const employerProfile = await getEmployerProfile(user.id);
  if (!employerProfile) return NextResponse.json({ message: "Employer profile not found" }, { status: 404 });

  const existingJob = await getJobById(id);
  if (!existingJob || existingJob.employerId !== employerProfile.id) {
    return NextResponse.json({ message: "Job not found or not owned by user" }, { status: 404 });
  }

  await deleteJob(id);
  return NextResponse.json({ message: "Deleted" });
}
