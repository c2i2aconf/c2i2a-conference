'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import type { ScheduleSession } from '@/lib/schedule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock } from 'lucide-react'
import { formatDate } from '@/lib/dates'

interface ProgramScheduleProps {
  sessions: ScheduleSession[]
}

function getBadgeColor(type: ScheduleSession['type']) {
  switch (type) {
    case 'keynote': return 'bg-primary text-primary-foreground'
    case 'ceremony': return 'bg-accent text-accent-foreground'
    case 'break': return 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
    case 'session': return 'bg-secondary text-secondary-foreground'
    default: return ''
  }
}

function getBorderColor(type: ScheduleSession['type']) {
  switch (type) {
    case 'keynote': return 'border-l-primary'
    case 'ceremony': return 'border-l-accent'
    case 'break': return 'border-l-amber-500'
    case 'session': return 'border-l-secondary'
    default: return 'border-l-muted'
  }
}

export function ProgramSchedule({ sessions }: ProgramScheduleProps) {
  const t = useTranslations('program')
  const locale = useLocale()

  // Group by date
  const groupedByDate = React.useMemo(() => {
    const map = new Map<string, ScheduleSession[]>()
    sessions.forEach(s => {
      const d = s.date
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(s)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [sessions])

  const [activeDate, setActiveDate] = React.useState(groupedByDate[0]?.[0] || '')

  const activeSessions = React.useMemo(
    () => groupedByDate.find(g => g[0] === activeDate)?.[1] || [],
    [groupedByDate, activeDate]
  )

  // Group active sessions by time slot
  const timeSlots = React.useMemo(() => {
    const map = new Map<string, ScheduleSession[]>()
    activeSessions.forEach(s => {
      const time = `${s.startTime} - ${s.endTime}`
      if (!map.has(time)) map.set(time, [])
      map.get(time)!.push(s)
    })
    // Sort times by startTime
    return Array.from(map.entries()).sort((a, b) => {
      const timeA = a[1][0].startTime
      const timeB = b[1][0].startTime
      return timeA.localeCompare(timeB)
    })
  }, [activeSessions])

  if (!sessions || sessions.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t('empty')}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Day Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {groupedByDate.map(([date]) => (
          <Button
            key={date}
            variant={activeDate === date ? 'default' : 'outline'}
            onClick={() => setActiveDate(date)}
            className="rounded-full"
          >
            {formatDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Button>
        ))}
      </div>

      {/* Sessions Grid */}
      <div className="space-y-8">
        {timeSlots.map(([timeLabel, slotSessions]) => (
          <div key={timeLabel} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3 lg:col-span-2 pt-2">
              <div className="sticky top-20 flex items-center gap-2 text-primary font-semibold text-lg">
                <Clock className="w-5 h-5" />
                <span>{timeLabel}</span>
              </div>
            </div>
            
            <div className="md:col-span-9 lg:col-span-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {slotSessions.map((session) => {
                const isFullWidth = session.type === 'keynote' || session.type === 'break' || session.type === 'ceremony'
                
                return (
                  <Card key={session.id} className={`${isFullWidth ? 'lg:col-span-2' : ''} border-l-4 ${getBorderColor(session.type)}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <Badge className={getBadgeColor(session.type)} variant="outline">
                          {t(`types.${session.type}`)}
                        </Badge>
                        {session.room && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                            <MapPin className="w-4 h-4" />
                            {session.room.name}
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-xl">
                        {session.title || (session.speakers.length > 0 ? session.speakers[0].name : t('types.session'))}
                      </CardTitle>
                    </CardHeader>
                    {((session.speakers && session.speakers.length > 0) || session.description) && (
                      <CardContent>
                        {session.description && (
                          <p className="text-muted-foreground text-sm mb-4">{session.description}</p>
                        )}
                        {session.speakers && session.speakers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {session.speakers.map((speaker, i) => (
                              <div key={speaker.id || i} className="flex items-center gap-2 text-sm font-medium">
                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs overflow-hidden">
                                  {speaker.name.charAt(0)}
                                </div>
                                <span>{speaker.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
