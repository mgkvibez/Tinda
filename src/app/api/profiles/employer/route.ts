import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmployerProfile, upsertEmployerProfile } from "@/lib/firebase";
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

  const profile = await getEmployerProfile(user.id);
  return NextResponse.json(profile ?? null);
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = employerSchema.parse(body);

    const upserted = await upsertEmployerProfile(user.id, {
      companyName: data.companyName ?? null,
      logo: data.logo ?? null,
      industry: data.industry ?? null,
      companySize: data.companySize ?? null,
      website: data.website ?? null,
      headquarters: data.headquarters ?? null,
      aboutCompany: data.aboutCompany ?? null,
      recruiterName: data.recruiterName ?? null,
      recruiterPosition: data.recruiterPosition ?? null,
      recruiterEmail: data.recruiterEmail ?? null,
      recruiterPhone: data.recruiterPhone ?? null,
      subscriptionTier: data.subscriptionTier ?? null,
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
