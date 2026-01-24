import { DayLog } from '../domain/models';
import { computeDayDecisionSummary } from '../domain/decisions';

export interface CoachContext {
  dayLog: DayLog | null;
  userMessage: string;
}

/**
 * Stub simple de coach.
 * TODO: reemplazar por integración con modelo de lenguaje (ChatGPT u otro)
 * usando DayLog + historial como contexto.
 */
export async function generateCoachReply(context: CoachContext): Promise<string> {
  const text = context.userMessage.toLowerCase();

  if (!context.dayLog) {
    return 'Empezamos hoy. Contame qué querés registrar (desayuno, actividad, peso o cómo te sentís).';
  }

  if (text.includes('buen día') || text.includes('buen dia')) {
    return 'Buen día. Vamos a sumar decisiones tranquilas hoy, sin buscar perfección.';
  }

  if (text.includes('peso') || text.includes('pesé') || text.includes('pese')) {
    return 'Peso registrado. Nos importa más la tendencia de varias semanas que el número de hoy.';
  }

  if (text.includes('cumple') || text.includes('asado') || text.includes('evento')) {
    return 'Eventos sociales son parte del plan. La clave es cómo acomodamos el resto del día para mantener el rumbo.';
  }

  if (text.includes('hambre')) {
    return 'Si tenés hambre, prioricemos algo simple y saciante: proteína + algo de grasa buena, evitando picoteos interminables.';
  }

  const decision = computeDayDecisionSummary(context.dayLog);
  if (!decision) {
    return 'Todavía el día está casi vacío. Con que registres 1-2 decisiones importantes ya estamos sumando.';
  }

  if (decision.status === 'verde') {
    return 'El día viene bien gestionado. Podés permitirte flexibilidad mientras mantengamos esta dirección.';
  }

  if (decision.status === 'amarillo') {
    return 'Tuvimos algún desvío pero lo venís corrigiendo. Eso es exactamente construir consistencia.';
  }

  return 'Hoy costó un poco más, y está bien. Lo importante es qué decidimos hacer en la próxima comida o actividad.';
}

