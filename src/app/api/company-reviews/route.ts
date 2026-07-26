import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCompanyReviews, createCompanyReview } from '@/lib/firebase'
import * as z from 'zod'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const employerId = url.searchParams.get('employerId')

  if (!employerId) return NextResponse.json({ message: 'Missing employerId' }, { status: 400 })

  const { reviews, avgRating, total } = await getCompanyReviews(employerId)
  return NextResponse.json({ reviews, avgRating, total })
}

const reviewSchema = z.object({
  employerId: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string().min(3).max(100),
  pros: z.string().min(3).max(500),
  cons: z.string().min(3).max(500),
  isAnonymous: z.boolean().default(true),
})

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = reviewSchema.parse(body)

    const review = await createCompanyReview({
      ...data,
      reviewerId: session.user.id,
      reviewerName: data.isAnonymous ? 'Anonymous' : (session.user.name || 'Anonymous'),
    })

    return NextResponse.json({ review })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ message: 'Failed to create review' }, { status: 500 })
  }
}
