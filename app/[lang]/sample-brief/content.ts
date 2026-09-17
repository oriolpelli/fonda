import type { Locale } from "@/lib/i18n/config";
import type { BriefingContent } from "@/lib/briefing";
import { SAMPLE_HOTEL, sampleNightLine, sampleSoftNightLine } from "@/lib/sample-hotel";

/**
 * The long-form version of the brief the homepage shows in miniature: same
 * invented hotel, same invented night, same guests. Written per language rather
 * than translated from English, because a brief is prose and reads wrong when
 * it is a translation of a translation.
 *
 * Every name and number is INVENTED — see `lib/sample-hotel.ts`, which is the
 * only place the hotel is defined. This file must never hardcode the hotel's
 * name, its room count or the date; read them from the fixture so the homepage
 * and this page cannot drift apart again (they did: this page used to describe
 * a different hotel, of a different size, on a different night, behind a link
 * that promised the homepage's one).
 */
export interface SampleBrief {
  dateLine: string;
  content: BriefingContent;
  /** The "what Fondas did overnight" closing note, rendered after the article. */
  overnight: string;
}

export function getSampleBrief(locale: Locale): SampleBrief {
  const h = SAMPLE_HOTEL;
  const night = sampleNightLine(locale, { withYear: true });
  const soft = sampleSoftNightLine(locale);
  const g = h.guests;

  if (locale === "es") {
    return {
      dateLine: `${night} · 6:30`,
      content: {
        summary: `Buenos días. Jueves con movimiento: ${h.arrivals} llegadas, ${h.departures} salidas y el hotel al ${h.occupancyPct}% esta noche — ${h.occupiedTonight} de ${h.rooms} habitaciones. La familia ${g.aguirreMiralles} deja hoy la Suite Jardín después de ocho noches; pisos ya sabe que la habitación necesita un repaso a fondo antes de las llegadas de las 16:00.

Tres llegadas de hoy aún no han confirmado hora. Se les escribió anoche; dos suelen contestar antes de media mañana.`,
        arrivals: `${h.arrivals} llegadas hoy. Dos a tener en cuenta: ${g.bofill} (habitación 204, Junior Suite, tercera estancia) — la última vez pidió el lado tranquilo del patio, y la 204 ya está bloqueada para ella. Y el grupo ${g.ashworth} (Doble Deluxe, dos habitaciones) — llegan a media tarde y han preguntado si pueden dejar las maletas antes del check-in.

Una llegada tarde: ${g.lund} aterriza a las 23:40 desde Copenhague y calcula llegar al hotel hacia las doce y media. La recepción de noche está avisada y su llave, preparada.

Las salidas, tranquilas: ${h.departures} check-outs, todos antes de mediodía, sin cargos pendientes. Siguen sin confirmar hora: ${g.ortega} (2 noches), ${g.lund} y el grupo ${g.ashworth} — se les escribió anoche, sin respuesta todavía.`,
        emails: `La noche ha traído cuatro correos de huéspedes; uno merece tu atención. ${g.vidal} (llega el martes, Suite Jardín) escribe que su padre camina con bastón y pregunta si se puede subir a la terraza del desayuno en ascensor. Hay una respuesta redactada esperando: confirma que el ascensor llega a la terraza, aclara que arriba no hay escalones y recuerda que la Suite Jardín está en la planta del patio, sin un solo escalón hasta recepción. Revísala y envíala cuando quieras.

Los otros tres — una consulta de parking, una petición de late check-out y una confirmación de reserva — también tienen borrador listo.`,
        rate_alert: `Esta noche estamos al ${h.occupancyPct}% y el fin de semana está prácticamente completo. El punto flojo es el ${soft.toLowerCase()}: ${h.softNightRooms} de ${h.rooms} habitaciones, poco habitual para finales de junio — el año pasado ese jueves cerró al 90%. Vale la pena revisar la tarifa, o pensar una oferta entre semana, antes del fin de semana.`,
      },
      overnight: `Durante la noche, Fondas ha cruzado cuatro correos con sus reservas y ha redactado las respuestas, ha reclamado tres horas de llegada sin confirmar, ha vigilado la ocupación de los próximos 14 días y ha escrito este resumen. Tu mañana empieza aquí.`,
    };
  }

  if (locale === "ca") {
    return {
      dateLine: `${night} · 6:30`,
      content: {
        summary: `Bon dia. Dijous amb moviment: ${h.arrivals} arribades, ${h.departures} sortides i l'hotel al ${h.occupancyPct}% aquesta nit — ${h.occupiedTonight} de ${h.rooms} habitacions. La família ${g.aguirreMiralles} deixa avui la Suite Jardí després de vuit nits; pisos ja sap que l'habitació necessita un repàs a fons abans de les arribades de les 16:00.

Tres arribades d'avui encara no han confirmat hora. Se'ls va escriure ahir a la nit; dues acostumen a contestar abans de mig matí.`,
        arrivals: `${h.arrivals} arribades avui. Dues a tenir en compte: ${g.bofill} (habitació 204, Junior Suite, tercera estada) — l'última vegada va demanar el costat tranquil del pati, i la 204 ja està bloquejada per a ella. I el grup ${g.ashworth} (Doble Deluxe, dues habitacions) — arriben a mitja tarda i han preguntat si poden deixar les maletes abans del check-in.

Una arribada tard: ${g.lund} aterra a les 23:40 des de Copenhaguen i calcula arribar a l'hotel cap a dos quarts d'una. La recepció de nit està avisada i la seva clau, a punt.

Les sortides, tranquil·les: ${h.departures} check-outs, tots abans de migdia, sense càrrecs pendents. Encara sense confirmar hora: ${g.ortega} (2 nits), ${g.lund} i el grup ${g.ashworth} — se'ls va escriure ahir a la nit, sense resposta encara.`,
        emails: `La nit ha portat quatre correus d'hostes; un mereix la teva atenció. ${g.vidal} (arriba dimarts, Suite Jardí) escriu que el seu pare camina amb bastó i pregunta si es pot pujar a la terrassa de l'esmorzar amb ascensor. Hi ha una resposta redactada esperant: confirma que l'ascensor arriba a la terrassa, aclareix que a dalt no hi ha escalons i recorda que la Suite Jardí és a la planta del pati, sense ni un escaló fins a recepció. Revisa-la i envia-la quan vulguis.

Els altres tres — una consulta de pàrquing, una petició de late check-out i una confirmació de reserva — també tenen esborrany a punt.`,
        rate_alert: `Aquesta nit estem al ${h.occupancyPct}% i el cap de setmana està pràcticament complet. El punt fluix és el ${soft.toLowerCase()}: ${h.softNightRooms} de ${h.rooms} habitacions, poc habitual per a finals de juny — l'any passat aquell dijous va tancar al 90%. Val la pena revisar la tarifa, o pensar una oferta entre setmana, abans del cap de setmana.`,
      },
      overnight: `Durant la nit, Fondas ha creuat quatre correus amb les seves reserves i ha redactat les respostes, ha reclamat tres hores d'arribada sense confirmar, ha vigilat l'ocupació dels propers 14 dies i ha escrit aquest resum. El teu matí comença aquí.`,
    };
  }

  return {
    dateLine: `${night} · 6:30`,
    content: {
      summary: `Good morning. A busy Thursday ahead: ${h.arrivals} arrivals, ${h.departures} departures, and the house at ${h.occupancyPct}% tonight — ${h.occupiedTonight} of ${h.rooms} rooms. The ${g.aguirreMiralles} family checks out of the Garden Suite after eight nights; housekeeping knows the room needs the full turnaround before the 16:00 arrivals.

Three of today's arrivals still haven't confirmed a time. All three were chased overnight; two usually answer by mid-morning.`,
      arrivals: `${h.arrivals} arrivals today. Two to watch: ${g.bofill} (room 204, Junior Suite, third stay) — last time she asked for the quiet side of the courtyard, and 204 is already blocked for her. And the ${g.ashworth} party (Deluxe Double, two rooms) — they land mid-afternoon and have asked whether they can leave luggage before check-in.

One late arrival: ${g.lund} lands at 23:40 from Copenhagen and expects to reach the hotel around half past midnight. The night desk is briefed and his key is ready.

Departures are gentle: ${h.departures} check-outs, all before noon, no open balances. Still unconfirmed for today: ${g.ortega} (2 nights), ${g.lund} and the ${g.ashworth} party — chased last night, no reply yet.`,
      emails: `Overnight brought four guest emails; one needs your eye. ${g.vidal} (arriving Tuesday, Garden Suite) writes that her father walks with a stick and asks whether the roof terrace is reachable by lift. A reply is drafted and waiting: it confirms the lift reaches the terrace, notes there are no steps at the top, and points out that the Garden Suite sits on the courtyard level with step-free access to reception. Review and send when you're ready.

The other three — a parking question, a late check-out request, and a booking confirmation — have drafts ready too.`,
      rate_alert: `Tonight sits at ${h.occupancyPct}% and the weekend is essentially full. The soft spot is ${soft}: ${h.softNightRooms} of ${h.rooms} rooms, unusual for late June — last summer that Thursday closed at 90%. Worth a look at the midweek rate, or an offer, before the weekend.`,
    },
    overnight: `Overnight, Fondas matched four emails to their reservations and drafted the replies, chased three unconfirmed arrival times, watched the next 14 days of occupancy, and wrote this brief. Your morning starts here.`,
  };
}
