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
  /**
   * The same morning, cut into the cards the page leads with on a phone. The
   * prose above stays the full brief (it is what prints, and it sits behind
   * "Read the full brief"); these are its highlights, so every fact here must
   * also be in the prose — never a new one.
   */
  cards: SampleBriefCards;
}

export interface SampleBriefCards {
  /** Two sentences at most — the brief before the brief. */
  tldr: string;
  arrivals: { name: string; detail: string; note: string; status: string }[];
  /** Guests whose arrival time is still open; chased overnight. */
  unconfirmed: string[];
  /** The other three drafts, as short topic labels. */
  otherDrafts: string[];
  /** One line under the occupancy chart, about the soft night. */
  occupancyNote: string;
  /** What Fondas did overnight, as a timeline. */
  overnightSteps: { time: string; text: string }[];
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
      cards: {
        tldr: `Jueves con movimiento y el hotel casi lleno. Solo dos cosas piden tu atención: un correo con la respuesta ya redactada y tres horas de llegada por confirmar.`,
        arrivals: [
          { name: g.bofill, detail: "Hab. 204 · Junior Suite · 3.ª estancia", note: "La última vez pidió el lado tranquilo del patio.", status: "204 bloqueada para ella" },
          { name: `Grupo ${g.ashworth}`, detail: "2 × Doble Deluxe · media tarde", note: "Preguntan si pueden dejar las maletas antes del check-in.", status: "Pregunta abierta" },
          { name: g.lund, detail: "Aterriza a las 23:40 · llega hacia las 00:30", note: "La recepción de noche está avisada.", status: "Llave preparada" },
        ],
        unconfirmed: [g.ortega, g.lund, `Grupo ${g.ashworth}`],
        otherDrafts: ["Parking", "Late check-out", "Confirmación de reserva"],
        occupancyNote: `El ${soft.toLowerCase()} está flojo: ${h.softNightRooms} de ${h.rooms}. El año pasado cerró al 90%. Vale la pena revisar la tarifa antes del fin de semana.`,
        overnightSteps: [
          { time: "23:15", text: `Cruzó el correo de ${g.vidal} con su reserva y redactó la respuesta.` },
          { time: "23:50", text: "Redactó otros tres borradores: parking, late check-out y una confirmación." },
          { time: "01:00", text: "Reclamó tres horas de llegada sin confirmar." },
          { time: "05:45", text: "Revisó la ocupación de los próximos 14 días." },
          { time: "06:30", text: "Escribió este resumen." },
        ],
      },
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
      cards: {
        tldr: `Dijous amb moviment i l'hotel gairebé ple. Només dues coses demanen la teva atenció: un correu amb la resposta ja redactada i tres hores d'arribada per confirmar.`,
        arrivals: [
          { name: g.bofill, detail: "Hab. 204 · Junior Suite · 3a estada", note: "L'última vegada va demanar el costat tranquil del pati.", status: "204 bloquejada per a ella" },
          { name: `Grup ${g.ashworth}`, detail: "2 × Doble Deluxe · mitja tarda", note: "Pregunten si poden deixar les maletes abans del check-in.", status: "Pregunta oberta" },
          { name: g.lund, detail: "Aterra a les 23:40 · arriba cap a les 00:30", note: "La recepció de nit està avisada.", status: "Clau a punt" },
        ],
        unconfirmed: [g.ortega, g.lund, `Grup ${g.ashworth}`],
        otherDrafts: ["Pàrquing", "Late check-out", "Confirmació de reserva"],
        occupancyNote: `El ${soft.toLowerCase()} està fluix: ${h.softNightRooms} de ${h.rooms}. L'any passat va tancar al 90%. Val la pena revisar la tarifa abans del cap de setmana.`,
        overnightSteps: [
          { time: "23:15", text: `Va creuar el correu de ${g.vidal} amb la seva reserva i en va redactar la resposta.` },
          { time: "23:50", text: "Va redactar tres esborranys més: pàrquing, late check-out i una confirmació." },
          { time: "01:00", text: "Va reclamar tres hores d'arribada sense confirmar." },
          { time: "05:45", text: "Va revisar l'ocupació dels propers 14 dies." },
          { time: "06:30", text: "Va escriure aquest resum." },
        ],
      },
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
    cards: {
      tldr: `A busy Thursday and a nearly full house. Only two things need you: one email with its reply already drafted, and three arrival times still to confirm.`,
      arrivals: [
        { name: g.bofill, detail: "Room 204 · Junior Suite · 3rd stay", note: "Last time she asked for the quiet side of the courtyard.", status: "204 blocked for her" },
        { name: `${g.ashworth} party`, detail: "2 × Deluxe Double · mid-afternoon", note: "Asking to leave luggage before check-in.", status: "Open question" },
        { name: g.lund, detail: "Lands 23:40 · at the hotel around 00:30", note: "The night desk is briefed.", status: "Key ready" },
      ],
      unconfirmed: [g.ortega, g.lund, `${g.ashworth} party`],
      otherDrafts: ["Parking", "Late check-out", "Booking confirmation"],
      occupancyNote: `${soft} is soft: ${h.softNightRooms} of ${h.rooms}. Last year it closed at 90%. Worth a look at the rate before the weekend.`,
      overnightSteps: [
        { time: "23:15", text: `Matched ${g.vidal}'s email to her booking and drafted the reply.` },
        { time: "23:50", text: "Drafted three more: parking, late check-out and a confirmation." },
        { time: "01:00", text: "Chased three unconfirmed arrival times." },
        { time: "05:45", text: "Checked occupancy for the next 14 days." },
        { time: "06:30", text: "Wrote this brief." },
      ],
    },
  };
}
