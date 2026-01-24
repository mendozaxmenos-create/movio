import { DayLog } from '../domain/models';
import { computeDayBehaviorKpis, computeDayDecisionSummary } from '../domain/decisions';

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

  // Saludos de arranque
  if (text.includes('buen día') || text.includes('buen dia')) {
    return 'Buen día. Vamos a sumar decisiones tranquilas hoy, sin buscar perfección.';
  }

  // Preguntas sobre "cómo venimos"
  if (text.includes('cómo vengo') || text.includes('como vengo') || text.includes('como venimos')) {
    const decision = computeDayDecisionSummary(context.dayLog);
    const kpis = computeDayBehaviorKpis(context.dayLog);

    if (!kpis.hasAnyLog) {
      return 'Recién estamos empezando el día. Con registrar 1 o 2 decisiones importantes ya es un buen comienzo.';
    }

    if (!decision) {
      return 'Tenés algunos registros, pero todavía el día está incompleto. Sigamos sumando decisiones tranquilas.';
    }

    if (decision.status === 'verde') {
      return 'Venís muy bien gestionado hoy. Hubo decisiones alineadas al plan y no se ve ningún desvío importante.';
    }

    if (decision.status === 'amarillo') {
      return 'Hubo algún desvío, pero lo venís corrigiendo con buenas decisiones y actividad. Eso es exactamente consistencia.';
    }

    return 'Hoy hubo desvíos que todavía no compensaste del todo. No pasa nada: enfoquémosnos en que la próxima comida o actividad vaya alineada al plan.';
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

  if (text.includes('sobras') || text.includes('empanada') || text.includes('empanadas') || text.includes('sandwich')) {
    return 'Si tenés sobras como empanadas o sándwiches, podemos usarlas sin problema. La idea es equilibrar con más verdura y proteína en el resto del día para que encaje en el plan.';
  }

  if (text.includes('no cen') || text.includes('sin cena')) {
    return 'Que una comida falte (por ejemplo la cena) no es un problema aislado. Lo importante es que el día siguiente vuelva a una estructura razonable de comidas y no compensar con exceso.';
  }

  if (text.includes('desayun') || text.includes('desayuno')) {
    return 'Para el desayuno, una combinación tipo 2 huevos, palta y algo de fruta o yogur descremado suele darte saciedad sin complicar el resto del día.';
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

