import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getAssessmentByJob,
  getAssessmentById,
  saveAssessmentResult,
  getAssessmentResult,
  createAssessment,
} from '@/lib/firebase'
import * as z from 'zod'

// GET: fetch assessment for a job (hides correct answers)
export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const jobId = url.searchParams.get('jobId')
  const assessmentId = url.searchParams.get('assessmentId')

  let assessment = null
  if (assessmentId) {
    assessment = await getAssessmentById(assessmentId)
  } else if (jobId) {
    assessment = await getAssessmentByJob(jobId)
  }

  if (!assessment) {
    return NextResponse.json({ assessment: null })
  }

  // Check if user already completed it
  const result = await getAssessmentResult(assessment.id, session.user.id)

  // Strip correct answers from questions
  const safeQuestions = assessment.questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    skill: q.skill,
  }))

  return NextResponse.json({
    assessment: { ...assessment, questions: safeQuestions },
    previousResult: result,
  })
}

// POST: submit assessment answers
const submitSchema = z.object({
  assessmentId: z.string(),
  jobId: z.string(),
  answers: z.array(z.number()),
})

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = submitSchema.parse(body)

    const assessment = await getAssessmentById(data.assessmentId)
    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 })
    }

    // Calculate score
    let correct = 0
    for (let i = 0; i < assessment.questions.length; i++) {
      if (data.answers[i] === assessment.questions[i].correctIndex) {
        correct++
      }
    }

    const score = Math.round((correct / assessment.questions.length) * 100)
    const passed = score >= assessment.passingScore

    const result = await saveAssessmentResult({
      assessmentId: data.assessmentId,
      jobId: data.jobId,
      candidateId: session.user.id,
      answers: data.answers,
      score,
      passed,
    })

    return NextResponse.json({ result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    console.error('Assessment submission error:', error)
    return NextResponse.json({ message: 'Failed to submit assessment' }, { status: 500 })
  }
}

// PUT: create assessment (employer only)
const createSchema = z.object({
  jobId: z.string(),
  title: z.string(),
  description: z.string(),
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    options: z.array(z.string()),
    correctIndex: z.number(),
    skill: z.string(),
  })),
  passingScore: z.number().min(0).max(100),
})

export async function PUT(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const assessment = await createAssessment({
      ...data,
      employerId: session.user.id,
    })

    return NextResponse.json({ assessment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    console.error('Assessment creation error:', error)
    return NextResponse.json({ message: 'Failed to create assessment' }, { status: 500 })
  }
}
