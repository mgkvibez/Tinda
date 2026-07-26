import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMockInterviews, saveMockInterview } from '@/lib/firebase'
import { generateInterviewFeedback } from '@/lib/ai-helpers'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const interviews = await getMockInterviews(session.user.id)
  return NextResponse.json({ interviews })
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { questions, jobId, jobTitle } = body

    // Generate AI feedback for each answered question
    const scoredQuestions = []
    for (const q of questions) {
      if (q.answer && q.answer.trim().length > 10) {
        const feedback = await generateInterviewFeedback(q.question, q.answer, jobTitle)
        scoredQuestions.push({ ...q, aiFeedback: feedback.feedback, score: feedback.score })
      } else {
        scoredQuestions.push({ ...q, aiFeedback: null, score: null })
      }
    }

    const answeredQs = scoredQuestions.filter((q) => q.score !== null)
    const overallScore = answeredQs.length > 0 ? Math.round(answeredQs.reduce((s, q) => s + (q.score || 0), 0) / answeredQs.length) : null

    const interview = await saveMockInterview(session.user.id, {
      jobId: jobId || null,
      jobTitle: jobTitle || null,
      questions: scoredQuestions,
      overallScore,
    })

    return NextResponse.json({ interview })
  } catch (error) {
    console.error('Mock interview error:', error)
    return NextResponse.json({ message: 'Failed to save interview' }, { status: 500 })
  }
}
