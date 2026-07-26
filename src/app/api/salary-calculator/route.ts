import { NextResponse } from 'next/server'
import { estimateSalary } from '@/lib/ai-helpers'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const role = url.searchParams.get('role') || ''
  const location = url.searchParams.get('location') || ''
  const experience = (url.searchParams.get('experience') as 'entry' | 'mid' | 'senior') || 'mid'

  if (!role) return NextResponse.json({ message: 'Missing role' }, { status: 400 })

  const estimate = estimateSalary(role, location, experience)
  return NextResponse.json({ estimate })
}
