import { DayLog, DayStatus, ISODate } from '../domain/models';
import { computeDayBehaviorKpis, computeDayDecisionSummary } from '../domain/decisions';

export interface OverviewStats {
  from: ISODate;
  to: ISODate;
  daysCount: number;
  daysWithLogs: number;
  greenDays: number;
  yellowDays: number;
  redDays: number;
}

export interface DeviationDaySummary {
  day: ISODate;
  status: DayStatus | null;
  hasDeviation: boolean;
  hasRecovery: boolean;
}

export function computeOverviewStats(from: ISODate, to: ISODate, days: DayLog[]): OverviewStats {
  let daysWithLogs = 0;
  let greenDays = 0;
  let yellowDays = 0;
  let redDays = 0;

  for (const day of days) {
    const kpis = computeDayBehaviorKpis(day);
    if (kpis.hasAnyLog) {
      daysWithLogs += 1;
    }
    const decision = computeDayDecisionSummary(day);
    if (!decision) continue;

    if (decision.status === 'verde') greenDays += 1;
    if (decision.status === 'amarillo') yellowDays += 1;
    if (decision.status === 'rojo') redDays += 1;
  }

  return {
    from,
    to,
    daysCount: days.length,
    daysWithLogs,
    greenDays,
    yellowDays,
    redDays,
  };
}

export function listDeviationDays(days: DayLog[]): DeviationDaySummary[] {
  const result: DeviationDaySummary[] = [];
  for (const day of days) {
    const kpis = computeDayBehaviorKpis(day);
    if (!kpis.hasDeviation) continue;
    const decision = computeDayDecisionSummary(day);
    result.push({
      day: day.day,
      status: decision ? decision.status : null,
      hasDeviation: kpis.hasDeviation,
      hasRecovery: kpis.hasRecovery,
    });
  }
  return result;
}

