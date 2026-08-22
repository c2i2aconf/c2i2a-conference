import type { Session } from '@/payload-types'

/**
 * The fields ProgramSchedule actually renders. Mapping depth-2 sessions down
 * to this shape keeps the serialized RSC payload small (full speaker/room
 * docs never reach the client).
 */
export interface ScheduleSession {
  id: number
  title?: string | null
  date: string
  startTime: string
  endTime: string
  type: Session['type']
  description?: string | null
  room: { name: string } | null
  speakers: { id: number; name: string }[]
}

export function toScheduleSessions(sessions: Session[]): ScheduleSession[] {
  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    type: session.type,
    description: session.description,
    room: session.room && typeof session.room === 'object' ? { name: session.room.name } : null,
    speakers: (session.speakers ?? [])
      .map((speaker) =>
        typeof speaker === 'object' ? { id: speaker.id, name: speaker.name } : null,
      )
      .filter((speaker): speaker is { id: number; name: string } => speaker !== null),
  }))
}
