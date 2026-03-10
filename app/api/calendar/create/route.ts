import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, date, start, end, notes } = await req.json()

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({ access_token: session.access_token })

  const calendar = google.calendar({ version: 'v3', auth })
  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      description: notes || '',
      start: { dateTime: `${date}T${start}:00`, timeZone: 'Asia/Karachi' },
      end: { dateTime: `${date}T${end}:00`, timeZone: 'Asia/Karachi' },
    },
  })

  return NextResponse.json({ event: event.data })
}
