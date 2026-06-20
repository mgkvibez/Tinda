import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserType } from "@prisma/client";
import * as z from "zod";

const swipeSchema = z.object({
  targetType: z.enum(["job", "candidate"]),
  targetId: z.string(),
  targetJobId: z.string().nullable().optional(),
  isLike: z.boolean(),
  isSuperLike: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (user.userType === UserType.Candidate) {
    const now = new Date();
    const jobs = await prisma.job.findMany({
      where: {
        isPublished: true,
        isArchived: false,
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: now } },
        ],
        NOT: {
          swipes: {
            some: {
              swiperId: user.id,
            },
          },
        },
      },
      include: {
        employer: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(
      jobs.map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        salaryRangeMin: job.salaryRangeMin,
        salaryRangeMax: job.salaryRangeMax,
        skillsRequired: job.skillsRequired,
        workArrangement: job.workArrangement,
        employmentType: job.employmentType,
        companyName: job.employer.companyName,
        companyLogo: job.employer.logo,
        recruiterName: job.employer.recruiterName,
        jobId: job.id,
      }))
    );
  }

  if (user.userType === UserType.Employer) {
    const candidates = await prisma.user.findMany({
      where: {
        userType: UserType.Candidate,
        candidateProfile: { isNot: null },
        NOT: {
          swipesMade: {
            some: {
              swiperId: user.id,
            },
          },
        },
      },
      include: {
        candidateProfile: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(
      candidates.map((candidate) => ({
        id: candidate.id,
        fullName: candidate.candidateProfile?.fullName ?? candidate.name,
        profilePicture: candidate.candidateProfile?.profilePicture,
        currentRole: candidate.candidateProfile?.currentRole,
        yearsOfExperience: candidate.candidateProfile?.yearsOfExperience,
        skills: candidate.candidateProfile?.skills,
        education: candidate.candidateProfile?.education,
        resumeScore: null,
        availability: candidate.candidateProfile?.availabilityStatus ?? "NotLooking",
      }))
    );
  }

  return NextResponse.json({ message: "Unsupported user type" }, { status: 400 });
}

export async function POST(request: Request) {
  const session = await auth();
  const user = (session as any)?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = swipeSchema.parse(body);

    const existingSwipe = await prisma.swipe.findFirst({
      where: {
        swiperId: user.id,
        targetId: data.targetId,
        targetJobId: data.targetJobId ?? undefined,
      },
    });

    const swipeData = {
      swiperId: user.id,
      targetId: data.targetId,
      targetJobId: data.targetJobId ?? undefined,
      isLike: data.isLike,
      isSuperLike: data.isSuperLike,
    };

    if (existingSwipe) {
      await prisma.swipe.update({ where: { id: existingSwipe.id }, data: swipeData });
    } else {
      await prisma.swipe.create({ data: swipeData });
    }

    let createdMatch = null;

    if (data.targetType === "job" && user.userType === UserType.Candidate && data.isLike) {
      const job = await prisma.job.findUnique({
        where: { id: data.targetId },
        include: {
          employer: {
            include: { user: true },
          },
        },
      });

      if (job && job.employer.user) {
        const employerUser = job.employer.user;
        const employerSwipe = await prisma.swipe.findFirst({
          where: {
            swiperId: employerUser.id,
            targetId: user.id,
            isLike: true,
          },
        });

        if (employerSwipe) {
          const match = await prisma.match.upsert({
            where: {
              candidateId_employerId_jobId: {
                candidateId: user.id,
                employerId: employerUser.id,
                jobId: job.id,
              },
            },
            create: {
              candidateId: user.id,
              employerId: employerUser.id,
              jobId: job.id,
            },
            update: {},
          });

          createdMatch = match;
          await prisma.conversation.upsert({
            where: { matchId: match.id },
            create: {
              matchId: match.id,
              participant1Id: user.id,
              participant2Id: employerUser.id,
            },
            update: {},
          });
        }
      }
    }

    if (data.targetType === "candidate" && user.userType === UserType.Employer && data.isLike) {
      const employerProfile = await prisma.employerProfile.findUnique({ where: { userId: user.id } });
      if (employerProfile) {
        const candidateId = data.targetId;
        const likedJobs = await prisma.swipe.findMany({
          where: {
            swiperId: candidateId,
            isLike: true,
            targetJobId: { not: null },
          },
        });

        for (const likedJob of likedJobs) {
          const job = await prisma.job.findUnique({ where: { id: likedJob.targetJobId! } });
          if (job && job.employerId === employerProfile.id) {
            const match = await prisma.match.upsert({
              where: {
                candidateId_employerId_jobId: {
                  candidateId,
                  employerId: user.id,
                  jobId: job.id,
                },
              },
              create: {
                candidateId,
                employerId: user.id,
                jobId: job.id,
              },
              update: {},
            });
            createdMatch = match;
            await prisma.conversation.upsert({
              where: { matchId: match.id },
              create: {
                matchId: match.id,
                participant1Id: candidateId,
                participant2Id: user.id,
              },
              update: {},
            });
          }
        }
      }
    }

    return NextResponse.json({ message: "Swipe recorded", match: createdMatch });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 });
    }
    console.error("Swipe error:", error);
    return NextResponse.json({ message: "Failed to record swipe." }, { status: 500 });
  }
}
