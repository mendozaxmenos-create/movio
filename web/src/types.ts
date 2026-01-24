export type ISODate = string;

export interface Meal {
  id: string;
  day: ISODate;
  type: 'desayuno' | 'almuerzo' | 'snack' | 'cena' | 'otro';
  kind: 'plan' | 'real';
  items: string[];
  portionSize: 'chico' | 'medio' | 'grande';
  contextTags: string[];
  createdAt: string;
}

export interface ActivitySession {
  id: string;
  day: ISODate;
  type: 'bici' | 'caminata' | 'natacion' | 'gym' | 'otro';
  durationMinutes?: number;
  distanceKm?: number;
  intensity: 'baja' | 'media' | 'alta';
  caloriesBurned?: number;
  caloriesTotal?: number;
  createdAt: string;
}

export interface WeightEntry {
  day: ISODate;
  weightKg: number;
  createdAt: string;
}

export interface DayNotes {
  day: ISODate;
  text: string;
  createdAt: string;
}

export interface CoachMessage {
  id: string;
  day: ISODate;
  createdAt: string;
  text: string;
}

export interface DayLog {
  day: ISODate;
  meals: Meal[];
  activities: ActivitySession[];
  weight?: WeightEntry;
  notes?: DayNotes;
}

export type TimelineEvent =
  | {
      id: string;
      day: ISODate;
      createdAt: string;
      type: 'meal';
      data: { kind: 'meal'; meal: Meal };
    }
  | {
      id: string;
      day: ISODate;
      createdAt: string;
      type: 'activity';
      data: { kind: 'activity'; activity: ActivitySession };
    }
  | {
      id: string;
      day: ISODate;
      createdAt: string;
      type: 'weight';
      data: { kind: 'weight'; weight: WeightEntry };
    }
  | {
      id: string;
      day: ISODate;
      createdAt: string;
      type: 'note';
      data: { kind: 'note'; note: DayNotes };
    }
  | {
      id: string;
      day: ISODate;
      createdAt: string;
      type: 'coach_message';
      data: { kind: 'coach_message'; message: CoachMessage };
    };

export interface TimelineResponse {
  day: DayLog;
  events: TimelineEvent[];
}

