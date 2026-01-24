import { CoachMessage, DayLog, TimelineEvent } from './models';

/**
 * Construye una vista de timeline para un día mezclando comidas,
 * actividades, peso, notas y mensajes del coach.
 */
export function buildDayTimeline(dayLog: DayLog, coachMessages: CoachMessage[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const meal of dayLog.meals) {
    events.push({
      id: `meal_${meal.id}`,
      day: dayLog.day,
      createdAt: meal.createdAt,
      type: 'meal',
      data: { kind: 'meal', meal },
    });
  }

  for (const activity of dayLog.activities) {
    events.push({
      id: `activity_${activity.id}`,
      day: dayLog.day,
      createdAt: activity.createdAt,
      type: 'activity',
      data: { kind: 'activity', activity },
    });
  }

  if (dayLog.weight) {
    events.push({
      id: `weight_${dayLog.weight.day}`,
      day: dayLog.day,
      createdAt: dayLog.weight.createdAt,
      type: 'weight',
      data: { kind: 'weight', weight: dayLog.weight },
    });
  }

  if (dayLog.notes) {
    events.push({
      id: `note_${dayLog.notes.day}`,
      day: dayLog.day,
      createdAt: dayLog.notes.createdAt,
      type: 'note',
      data: { kind: 'note', note: dayLog.notes },
    });
  }

  for (const message of coachMessages) {
    events.push({
      id: `coach_${message.id}`,
      day: dayLog.day,
      createdAt: message.createdAt,
      type: 'coach_message',
      data: { kind: 'coach_message', message },
    });
  }

  return events.sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
}

