import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createConversation, createMatch, getCandidateProfile, getEmployerProfile, getJobById, getUserById, listCandidateUsers, listJobs, listSwipesBySwiper, saveSwipe, updateSwipe, UserType } from "@/lib/firebase";
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
    const swipes = await listSwipesBySwiper(user.id);
    const swipedJobIds = new Set(swipes.filter((swipe: any) => swipe.targetJobId).map((swipe: any) => swipe.targetJobId));
    const jobs = await listJobs();

    const visibleJobs = jobs
      .filter((job: any) => {
        if (!job.isPublished || job.isArchived) return false;
        if (job.expiryDate && new Date(job.expiryDate) < new Date()) return false;
        return !swipedJobIds.has(job.id);
      })
      .slice(0, 20)
      .map((job: any) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        salaryRangeMin: job.salaryRangeMin,
        salaryRangeMax: job.salaryRangeMax,
        skillsRequired: job.skillsRequired,
        workArrangement: job.workArrangement,
        employmentType: job.employmentType,
        companyName: job.companyName,
        companyLogo: job.companyLogo,
        recruiterName: job.recruiterName,
        jobId: job.id,
      }));

    return NextResponse.json(visibleJobs);
  }

  if (user.userType === UserType.Employer) {
    const swipes = await listSwipesBySwiper(user.id);
    const swipedIds = new Set(swipes.map((swipe: any) => swipe.targetId));
    const candidates = await listCandidateUsers();

    const visibleCandidates = (await Promise.all(
      candidates
        .filter((candidate: any) => !swipedIds.has(candidate.id))
        .map(async (candidate: any) => {
          const profile = await getCandidateProfile(candidate.id);
          return {
            id: candidate.id,
            fullName: profile?.fullName ?? candidate.name,
            profilePicture: profile?.profilePicture,
            currentRole: profile?.currentRole,
            yearsOfExperience: profile?.yearsOfExperience,
            skills: profile?.skills,
            education: profile?.education,
            resumeScore: null,
            availability: "NotLooking",
          };
        })
    )).slice(0, 20);

    return NextResponse.json(visibleCandidates);
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

    const swipes = await listSwipesBySwiper(user.id);
    const existingSwipe = swipes.find((swipe: any) => swipe.targetId === data.targetId && (swipe.targetJobId ?? null) === (data.targetJobId ?? null));

    const swipeData = {
      swiperId: user.id,
      targetId: data.targetId,
      targetJobId: data.targetJobId ?? null,
      isLike: data.isLike,
      isSuperLike: data.isSuperLike,
    };

    if (existingSwipe) {
      await updateSwipe(existingSwipe.id, swipeData);
    } else {
      await saveSwipe({
        swiperId: user.id,
        targetId: data.targetId,
        targetJobId: data.targetJobId ?? null,
        isLike: data.isLike,
        isSuperLike: data.isSuperLike,
      });
    }

    let createdMatch = null;

    if (data.targetType === "job" && user.userType === UserType.Candidate && data.isLike) {
      const job = await getJobById(data.targetId);

      if (job) {
        const employerProfile = await getEmployerProfile(job.employerId);
        if (employerProfile) {
          const employerUser = await getUserById(employerProfile.userId);
          if (employerUser) {
            const employerSwipes = await listSwipesBySwiper(employerUser.id);
            const employerSwipe = employerSwipes.find((swipe: any) => swipe.targetId === user.id && swipe.isLike);

            if (employerSwipe) {
              const match = await createMatch({ candidateId: user.id, employerId: employerUser.id, jobId: job.id });
              createdMatch = match;
              await createConversation({ matchId: match.id, participant1Id: user.id, participant2Id: employerUser.id });
            }
          }
        }
      }
    }

    if (data.targetType === "candidate" && user.userType === UserType.Employer && data.isLike) {
      const employerProfile = await getEmployerProfile(user.id);
      if (employerProfile) {
        const candidateId = data.targetId;
        const candidateSwipes = await listSwipesBySwiper(candidateId);

        for (const likedJob of candidateSwipes.filter((swipe: any) => swipe.isLike && swipe.targetJobId)) {
          const job = await getJobById((likedJob as any).targetJobId);
          if (job && job.employerId === employerProfile.id) {
            const match = await createMatch({ candidateId, employerId: user.id, jobId: job.id });
            createdMatch = match;
            await createConversation({ matchId: match.id, participant1Id: candidateId, participant2Id: user.id });
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
