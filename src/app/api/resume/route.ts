import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getResume, saveResume } from '@/lib/firebase'
import * as z from 'zod'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const resume = await getResume(session.user.id)
  return NextResponse.json({ resume })
}

const resumeSchema = z.object({
  template: z.enum(['modern', 'classic', 'minimal']).optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  experience: z.array(z.object({
    id: z.string(),
    company: z.string(),
    role: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    current: z.boolean(),
    description: z.string(),
  })).optional(),
  education: z.array(z.object({
    id: z.string(),
    institution: z.string(),
    degree: z.string(),
    field: z.string(),
    graduationYear: z.string(),
    description: z.string(),
  })).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    link: z.string().nullable(),
  })).optional(),
  contact: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    linkedinUrl: z.string().nullable(),
    githubUrl: z.string().nullable(),
    portfolioUrl: z.string().nullable(),
  }).optional(),
})

export async function PUT(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = resumeSchema.parse(body)
    const resume = await saveResume(session.user.id, data)
    return NextResponse.json({ resume })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    console.error('Resume save error:', error)
    return NextResponse.json({ message: 'Failed to save resume' }, { status: 500 })
  }
}
