import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getCandidateProfile } from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    // Get user's flashcards and progress
    const cardsSnap = await adminDb.collection('flashcards').where('userId', '==', user.id).get()
    const progressSnap = await adminDb.collection('flashcardProgress').where('userId', '==', user.id).get()

    const cards = cardsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
    const progress = progressSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }))

    return NextResponse.json({ cards, progress })
  } catch (error) {
    console.error('Flashcards GET error:', error)
    return NextResponse.json({ message: 'Failed to fetch flashcards' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    if (action === 'generate') {
      // Generate flashcards based on candidate's role and skills
      const profile = await getCandidateProfile(user.id)
      if (!profile) return NextResponse.json({ message: 'Complete your profile first' }, { status: 400 })

      const role = profile.currentRole || 'Professional'
      const skills = profile.skills || []

      const generatedCards = generateFlashcards(role, skills)

      // Save to Firestore
      const batch = adminDb.batch()
      const savedCards: any[] = []
      for (const card of generatedCards) {
        const ref = adminDb.collection('flashcards').doc()
        const cardData = { ...card, userId: user.id, createdAt: new Date().toISOString() }
        batch.set(ref, cardData)
        savedCards.push({ id: ref.id, ...cardData })
      }
      await batch.commit()

      return NextResponse.json({ cards: savedCards, message: `Generated ${generatedCards.length} flashcards` })
    }

    if (action === 'review') {
      const { cardId, rating } = body as { cardId: string; rating: 'easy' | 'good' | 'hard' | 'again' }
      if (!cardId || !rating) return NextResponse.json({ message: 'cardId and rating required' }, { status: 400 })

      // Spaced repetition: SM-2 algorithm simplified
      const progressSnap = await adminDb
        .collection('flashcardProgress')
        .where('userId', '==', user.id)
        .where('cardId', '==', cardId)
        .limit(1)
        .get()

      const now = new Date()
      let interval = 1
      let easeFactor = 2.5
      let repetitions = 0

      if (!progressSnap.empty) {
        const existing = progressSnap.docs[0].data()
        easeFactor = existing.easeFactor || 2.5
        repetitions = (existing.repetitions || 0) + 1

        switch (rating) {
          case 'again':
            interval = 0
            repetitions = 0
            easeFactor = Math.max(1.3, easeFactor - 0.2)
            break
          case 'hard':
            interval = 1
            easeFactor = Math.max(1.3, easeFactor - 0.15)
            break
          case 'good':
            interval = repetitions === 1 ? 3 : repetitions === 2 ? 7 : Math.round(interval * easeFactor)
            break
          case 'easy':
            interval = repetitions === 1 ? 4 : Math.round((interval || 1) * easeFactor * 1.3)
            easeFactor = easeFactor + 0.15
            break
          default:
            interval = 1
        }
      } else {
        switch (rating) {
          case 'again': interval = 0; break
          case 'hard': interval = 1; break
          case 'good': interval = 3; break
          case 'easy': interval = 4; break
          default: interval = 1
        }
      }

      const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000)

      if (!progressSnap.empty) {
        await adminDb.collection('flashcardProgress').doc(progressSnap.docs[0].id).update({
          lastReview: now.toISOString(),
          nextReview: nextReview.toISOString(),
          easeFactor,
          repetitions,
          lastRating: rating,
        })
      } else {
        await adminDb.collection('flashcardProgress').add({
          userId: user.id,
          cardId,
          lastReview: now.toISOString(),
          nextReview: nextReview.toISOString(),
          easeFactor,
          repetitions: 1,
          lastRating: rating,
        })
      }

      return NextResponse.json({
        interval,
        nextReview: nextReview.toISOString(),
        repetitions,
        easeFactor,
      })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Flashcards POST error:', error)
    return NextResponse.json({ message: 'Failed to process flashcards' }, { status: 500 })
  }
}

function generateFlashcards(role: string, skills: string[]): Array<{
  category: string
  question: string
  answer: string
  difficulty: 'easy' | 'medium' | 'hard'
}> {
  const cards: Array<{ category: string; question: string; answer: string; difficulty: 'easy' | 'medium' | 'hard' }> = []

  // General interview questions
  const general = [
    { q: 'Tell me about yourself.', a: 'Structure: Present (current role), Past (relevant experience), Future (why this role). Keep it 90 seconds. Focus on achievements, not life story. End with why you\'re excited about THIS specific role.', d: 'easy' as const },
    { q: 'Why do you want to work here?', a: 'Research the company beforehand. Mention specific things: their product, mission, recent news, culture. Connect it to your skills and career goals. Show genuine enthusiasm, not generic flattery.', d: 'easy' as const },
    { q: 'What is your greatest strength?', a: 'Pick ONE strength relevant to the role. Back it with a specific example using STAR (Situation, Task, Action, Result). Quantify the result. Don\'t list multiple strengths — depth beats breadth.', d: 'easy' as const },
    { q: 'What is your greatest weakness?', a: 'Pick a real but non-disqualifying weakness. Show self-awareness. Most importantly, show what you\'re DOING about it. Never say "perfectionism" — it\'s cliché and not a real weakness.', d: 'medium' as const },
    { q: 'Where do you see yourself in 5 years?', a: 'Show ambition but flexibility. Align with the company\'s growth path. Mention wanting to deepen expertise and take on more responsibility. Avoid titles — focus on impact and growth.', d: 'medium' as const },
    { q: 'Why should we hire you?', a: 'Summarize: 1) Your most relevant skill/experience, 2) A specific achievement proving it, 3) How it maps to their needs. Be confident, not arrogant. End with enthusiasm for the role.', d: 'medium' as const },
    { q: 'Describe a conflict you had at work.', a: 'Use STAR. Focus on professional conflict, not personal. Show you listened, communicated respectfully, and found a solution. Emphasize what you learned. Never blame others.', d: 'medium' as const },
    { q: 'Tell me about a time you failed.', a: 'Pick a real failure (not a humblebrag). Own it. Show accountability. Most critically: show what you learned and how you\'ve applied that lesson since. Growth mindset is key.', d: 'hard' as const },
    { q: 'How do you handle pressure?', a: 'Give a specific example. Show you stay organized, prioritize, communicate proactively, and break problems into manageable pieces. Mention self-care/boundaries to show maturity.', d: 'easy' as const },
    { q: 'Why are you leaving your current job?', a: 'Never badmouth your employer. Focus on growth, new challenges, alignment with career goals. If laid off, say so honestly but briefly. Pivot to why THIS role excites you.', d: 'medium' as const },
  ]

  for (const item of general) {
    cards.push({
      category: 'Behavioral',
      question: item.q,
      answer: item.a,
      difficulty: item.d,
    })
  }

  // Role-specific questions
  const roleLower = role.toLowerCase()
  if (roleLower.includes('developer') || roleLower.includes('engineer') || roleLower.includes('programmer')) {
    cards.push(
      { category: 'Technical', question: 'Explain the difference between SQL and NoSQL databases.', answer: 'SQL: relational, structured schema, ACID guarantees, vertical scaling. NoSQL: flexible schema, horizontal scaling, eventually consistent (usually). Choose based on data structure, consistency needs, and scale. Examples: SQL (PostgreSQL, MySQL), NoSQL (MongoDB, DynamoDB).', difficulty: 'easy' },
      { category: 'Technical', question: 'What is the difference between authentication and authorization?', answer: 'Authentication = who you are (login, tokens, biometrics). Authorization = what you can do (permissions, roles, ACLs). You authenticate first, then authorize actions. Common mistake: conflating the two in access control logic.', difficulty: 'easy' },
      { category: 'Technical', question: 'Explain REST API design principles.', answer: 'Stateless, client-server, uniform interface (HTTP methods: GET/POST/PUT/DELETE), resource-based URLs (/users/123), proper status codes (200/201/400/404/500), versioning (/api/v1/). Use pagination for large datasets. Consistent naming conventions.', difficulty: 'medium' },
      { category: 'Technical', question: 'What is system design scaling? How do you handle it?', answer: 'Vertical (bigger machine) vs Horizontal (more machines). Strategies: load balancing, caching (Redis), database sharding, CDN for static assets, microservices, message queues (RabbitMQ/Kafka) for async processing. Start simple, scale when needed.', difficulty: 'hard' },
      { category: 'Technical', question: 'What is the CAP theorem?', answer: 'In distributed systems, you can have at most 2 of 3: Consistency, Availability, Partition tolerance. Since network partitions are inevitable, you choose between CP (consistency) or AP (availability). Most modern systems lean AP with eventual consistency.', difficulty: 'hard' },
    )
  }

  if (roleLower.includes('manager') || roleLower.includes('lead')) {
    cards.push(
      { category: 'Leadership', question: 'How do you handle a low-performing team member?', answer: '1-on-1 conversation to understand root cause. Set clear expectations and timeline. Provide resources/training. Document everything. If no improvement after reasonable time, involve HR. Never ignore it — it affects team morale.', difficulty: 'medium' },
      { category: 'Leadership', question: 'How do you prioritize features/roadmaps?', answer: 'Impact vs effort matrix. Align with company OKRs. Consider customer feedback, revenue impact, technical debt. Use RICE (Reach, Impact, Confidence, Effort) scoring. Communicate priorities transparently to stakeholders.', difficulty: 'medium' },
      { category: 'Leadership', question: 'How do you build trust in a remote team?', answer: 'Over-communicate. Regular 1:1s. Clear expectations and autonomy. Async-first documentation. Recognize publicly, correct privately. Virtual team building. Trust = consistency over time.', difficulty: 'easy' },
    )
  }

  // Skill-specific cards
  if (skills.includes('React') || skills.includes('react')) {
    cards.push(
      { category: 'React', question: 'What is the Virtual DOM and why does it matter?', answer: 'In-memory representation of the real DOM. React diffs the virtual DOM, then applies minimal changes to the real DOM (reconciliation). This avoids expensive direct DOM manipulation and enables declarative UI programming.', difficulty: 'easy' },
      { category: 'React', question: 'useEffect vs useLayoutEffect?', answer: 'useEffect runs after paint (async) — good for most side effects. useLayoutEffect runs synchronously before paint — use when you need to measure/manipulate DOM before the user sees it (e.g., tooltips, animations). Most of the time, use useEffect.', difficulty: 'medium' },
    )
  }

  if (skills.includes('Python') || skills.includes('python')) {
    cards.push(
      { category: 'Python', question: 'What are decorators in Python?', answer: 'Functions that modify other functions. Use @decorator_name syntax. Common use cases: logging, timing, authentication, caching. They wrap a function and can execute code before/after the wrapped function runs. Built-in examples: @property, @staticmethod.', difficulty: 'medium' },
      { category: 'Python', question: 'What is the GIL?', answer: 'Global Interpreter Lock. CPython\'s GIL ensures only one thread executes Python bytecode at a time. Means threading doesn\'t speed up CPU-bound tasks. Use multiprocessing or async for concurrency. Alternative interpreters (PyPy, Jython) handle this differently.', difficulty: 'hard' },
    )
  }

  return cards
}
