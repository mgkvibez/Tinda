import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createConversation,
  createMatch,
  getCandidateProfile,
  getEmployerProfile,
  getJobById,
  getUserById,
  listCandidateUsers,
  listJobs,
  listSwipesBySwiper,
  saveSwipe,
  updateSwipe,
  UserType,
} from "@/lib/firebase";
import * as z from "zod";

const swipeSchema = z.object({
  targetType: z.enum(["job", "candidate"]),
  targetId: z.string(),
  targetJobId: z.string().nullable().optional(),
  isLike: z.boolean(),
  isSuperLike: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  const session = await auth(request);
  const user = session?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (user.userType === UserType.Candidate) {
    const swipes = await listSwipesBySwiper(user.id);
    const swipedJobIds = new Set(swipes.filter((s) => s.targetJobId).map((s) => s.targetJobId));
    const jobs = await listJobs();

    const visibleJobs = jobs
      .filter((job) => {
        if (!job.isPublished || job.isArchived) return false;
        if (job.expiryDate && new Date(job.expiryDate) < new Date()) return false;
        return !swipedJobIds.has(job.id);
      })
      .slice(0, 20)
      .map((job) => ({
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
    const swipedIds = new Set(swipes.map((s) => s.targetId));
    const candidates = await listCandidateUsers();

    const visibleCandidates = (await Promise.all(
      candidates
        .filter((candidate) => !swipedIds.has(candidate.id))
        .map(async (candidate) => {
          const profile = await getCandidateProfile(candidate.id);
          return {
            id: candidate.id,
            fullName: profile?.fullName ?? candidate.name,
            profilePicture: profile?.profilePicture,
            currentRole: profile?.currentRole,
            yearsOfExperience: profile?.yearsOfExperience,
            skills: profile?.skills,
            education: profile?.education,
            availability: "NotLooking",
          };
        }),
    )).slice(0, 20);

    return NextResponse.json(visibleCandidates);
  }

  return NextResponse.json({ message: "Unsupported user type" }, { status: 400 });
}

export async function POST(request: Request) {
  const session = await auth(request);
  const user = session?.user;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = swipeSchema.parse(body);

    const swipes = await listSwipesBySwiper(user.id);
    const existingSwipe = swipes.find(
      (s) => s.targetId === data.targetId && (s.targetJobId ?? null) === (data.targetJobId ?? null),
    );

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
      await saveSwipe(swipeData);
    }

    let createdMatch = null;

    // Candidate likes a job → check if the employer already liked this candidate
    if (data.targetType === "job" && user.userType === UserType.Candidate && data.isLike) {
      const job = await getJobById(data.targetId);
      if (job) {
        const employerProfile = await getEmployerProfile(job.employerId);
        if (employerProfile) {
          // Use employerProfile.id (the profile doc id) — this is the same as job.employerId
          const employerSwipes = await listSwipesBySwiper(employerProfile.id);
          const employerSwipe = employerSwipes.find((s) => s.targetId === user.id && s.isLike);

          if (employerSwipe) {
            const match = await createMatch({
              candidateId: user.id,
              employerId: employerProfile.id,
              jobId: job.id,
            });
            createdMatch = match;
            await createConversation({
              matchId: match.id,
              participant1Id: user.id,
              participant2Id: employerProfile.id,
            });
          }
        }
      }
    }

    // Employer likes a candidate → check if the candidate already liked any of this employer's jobs
    if (data.targetType === "candidate" && user.userType === UserType.Employer && data.isLike) {
      const employerProfile = await getEmployerProfile(user.id);
      if (employerProfile) {
        const candidateId = data.targetId;
        const candidateSwipes = await listSwipesBySwiper(candidateId);

        for (const likedJob of candidateSwipes.filter((s) => s.isLike && s.targetJobId)) {
          const job = await getJobById(likedJob.targetJobId!);
          if (job && job.employerId === employerProfile.id) {
            const match = await createMatch({
              candidateId,
              employerId: employerProfile.id,
              jobId: job.id,
            });
            createdMatch = match;
            await createConversation({
              matchId: match.id,
              participant1Id: candidateId,
              participant2Id: employerProfile.id,
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
