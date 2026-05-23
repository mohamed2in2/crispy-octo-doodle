import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getStudentSessionWithRetry } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getStudentSessionWithRetry()

    if (!session) {
      console.error('Complete profile: No session found after retries')
      return NextResponse.json(
        { error: 'غير مصرح: لم يتم العثور على الجلسة. حاول مرة أخرى بعد لحظات.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, phone, parentPhone, age, educationalStage } = body

    if (!name?.trim() || !phone?.trim() || !parentPhone?.trim() || !age || !educationalStage?.trim()) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      )
    }

    const phoneStr = String(phone).trim()
    const parentPhoneStr = String(parentPhone).trim()

    if (phoneStr === parentPhoneStr) {
      return NextResponse.json(
        { error: 'رقم الطالب لا يمكن أن يكون نفس رقم الوالد/الوالدة' },
        { status: 400 }
      )
    }

    let primaryEmail = session.email
    let displayName = session.name || session.email.split('@')[0] || 'User'

    if (session.clerkId) {
      try {
        const client = await clerkClient()
        const clerkUser = await client.users.getUser(session.clerkId)
        primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || primaryEmail
        displayName = clerkUser.firstName || clerkUser.lastName
          ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
          : displayName
      } catch (clerkError) {
        console.error('Failed to fetch Clerk user data:', clerkError)
        // Continue with existing data
      }
    }

    if (!primaryEmail) {
      return NextResponse.json(
        { error: 'لم يتم العثور على البريد الإلكتروني للحساب' },
        { status: 400 }
      )
    }

    let user = await prisma.user.findUnique({
      where: { id: session.id },
    })

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: primaryEmail } })

      if (user && session.clerkId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId: session.clerkId },
        })
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: session.clerkId || null,
          email: primaryEmail,
          name: displayName,
          role: 'student',
          profileCompleted: false,
        },
      })
    }

    // Update user profile with trimmed values
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        phone: phoneStr,
        parentPhone: parentPhoneStr,
        age: age ? parseInt(String(age)) : undefined,
        educationalStage: educationalStage.trim(),
        profileCompleted: true,
      },
    })

    return NextResponse.json(
      { user },
      { status: 200 }
    )
  } catch (error) {
    console.error('Complete profile error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    )
  }
}
