import type { Locale } from "@/lib/i18n/config";
import type { BriefingContent } from "@/lib/briefing";

/**
 * The sample brief is content, not chrome: one fully fictional morning brief
 * for the invented 42-room "Hotel Miravent" in Barcelona, written per language
 * (not translated UI strings — see prompts/B4_sample_brief.md). Every name and
 * number is invented; keep it that way.
 */
export interface SampleBrief {
  dateLine: string;
  content: BriefingContent;
  /** The "what Fondas did overnight" closing note, rendered after the article. */
  overnight: string;
}

export const SAMPLE_BRIEF: Record<Locale, SampleBrief> = {
  en: {
    dateLine: "Friday, 26 June 2026 · 6:30",
    content: {
      summary: `Good morning. A busy Friday ahead: 11 arrivals, 6 departures, and the house at 88% tonight — 37 of 42 rooms. The Vidal-Roca family checks out of the Terrace Suite after nine nights; housekeeping knows the room needs the full turnaround before the Harrisons arrive at four.

Three of today's arrivals still haven't confirmed a time. All three were nudged overnight; two usually answer by mid-morning.`,
      arrivals: `Eleven arrivals today. Two to watch: Marta Julià (room 31, Junior Suite, third stay) — last time she asked for the quiet side of the courtyard, and 31 is already blocked for her. And the Harrisons (Terrace Suite, anniversary trip) — they booked the cava-and-flowers welcome; the florist delivers at noon.

One late arrival: Tomas Keller lands at 22:50 from Zurich and expects to reach the hotel around midnight. The night desk is briefed and his key is ready.

Departures are gentle: six check-outs, all before noon, no open balances. Still unconfirmed for today: Ferrand (2 nights), Okafor (Deluxe Double) and the Lindqvist couple — chased last night, no reply yet.`,
      emails: `Overnight brought four guest emails; one needs your eye. Sofia Marchetti (arriving Tuesday) writes that her mother uses a wheelchair and asks whether the rooftop breakfast is reachable. A reply is drafted and waiting: it confirms the lift reaches the roof terrace, offers the ground-floor Patio Double as an alternative, and proposes holding both rooms until Friday. Review and send when you're ready.

The other three — a parking question, a late check-out request, and a booking confirmation — have drafts ready too.`,
      rate_alert: `Tonight sits at 88% and the weekend is essentially full. The soft spot is Thursday 2 July: 21 of 42 rooms, unusual for the first week of July — last summer that Thursday closed at 90%. Worth a look at the rate, or a midweek offer, before the weekend.`,
    },
    overnight: `Overnight, Fondas matched four emails to their reservations and drafted the replies, chased three unconfirmed arrival times, watched the next 14 days of occupancy, and wrote this brief. Your morning starts here.`,
  },
  es: {
    dateLine: "Viernes, 26 de junio de 2026 · 6:30",
    content: {
      summary: `Buenos días. Viernes con movimiento: 11 llegadas, 6 salidas y el hotel al 88% esta noche — 37 de 42 habitaciones. La familia Vidal-Roca deja hoy la Suite Terraza después de nueve noches; pisos ya sabe que la habitación necesita un repaso a fondo antes de que lleguen los Harrison a las cuatro.

Tres llegadas de hoy aún no han confirmado hora. Se les escribió anoche; dos suelen contestar antes de media mañana.`,
      arrivals: `Once llegadas hoy. Dos a tener en cuenta: Marta Julià (habitación 31, Junior Suite, tercera estancia) — la última vez pidió el lado tranquilo del patio, y la 31 ya está bloqueada para ella. Y los Harrison (Suite Terraza, viaje de aniversario) — reservaron la bienvenida con cava y flores; la floristería entrega a mediodía.

Una llegada tarde: Tomas Keller aterriza a las 22:50 desde Zúrich y calcula llegar al hotel hacia medianoche. La recepción de noche está avisada y su llave, preparada.

Las salidas, tranquilas: seis check-outs, todos antes de mediodía, sin cargos pendientes. Siguen sin confirmar hora: Ferrand (2 noches), Okafor (Doble Deluxe) y la pareja Lindqvist — se les escribió anoche, sin respuesta todavía.`,
      emails: `La noche ha traído cuatro correos de huéspedes; uno merece tu atención. Sofia Marchetti (llega el martes) escribe que su madre va en silla de ruedas y pregunta si se puede subir al desayuno de la azotea. Hay una respuesta redactada esperando: confirma que el ascensor llega a la terraza, ofrece la Doble Patio de planta baja como alternativa y propone bloquear ambas habitaciones hasta el viernes. Revísala y envíala cuando quieras.

Los otros tres — una consulta de parking, una petición de late check-out y una confirmación de reserva — también tienen borrador listo.`,
      rate_alert: `Esta noche estamos al 88% y el fin de semana está prácticamente completo. El punto flojo es el jueves 2 de julio: 21 de 42 habitaciones, poco habitual para la primera semana de julio — el año pasado ese jueves cerró al 90%. Vale la pena revisar la tarifa, o pensar una oferta entre semana, antes del fin de semana.`,
    },
    overnight: `Durante la noche, Fondas ha cruzado cuatro correos con sus reservas y ha redactado las respuestas, ha reclamado tres horas de llegada sin confirmar, ha vigilado la ocupación de los próximos 14 días y ha escrito este resumen. Tu mañana empieza aquí.`,
  },
  ca: {
    dateLine: "Divendres, 26 de juny de 2026 · 6:30",
    content: {
      summary: `Bon dia. Divendres amb moviment: 11 arribades, 6 sortides i l'hotel al 88% aquesta nit — 37 de 42 habitacions. La família Vidal-Roca deixa avui la Suite Terrassa després de nou nits; pisos ja sap que l'habitació necessita un repàs a fons abans que arribin els Harrison a les quatre.

Tres arribades d'avui encara no han confirmat hora. Se'ls va escriure ahir a la nit; dos acostumen a contestar abans de mig matí.`,
      arrivals: `Onze arribades avui. Dues a tenir en compte: Marta Julià (habitació 31, Junior Suite, tercera estada) — l'última vegada va demanar el costat tranquil del pati, i la 31 ja està bloquejada per a ella. I els Harrison (Suite Terrassa, viatge d'aniversari) — van reservar la benvinguda amb cava i flors; la floristeria ho porta al migdia.

Una arribada tard: Tomas Keller aterra a les 22:50 des de Zuric i preveu arribar a l'hotel cap a mitjanit. La recepció de nit està avisada i la seva clau, preparada.

Les sortides, tranquil·les: sis check-outs, tots abans del migdia, sense càrrecs pendents. Encara sense confirmar hora: Ferrand (2 nits), Okafor (Doble Deluxe) i la parella Lindqvist — se'ls va escriure ahir a la nit, sense resposta encara.`,
      emails: `La nit ha portat quatre correus d'hostes; un mereix la teva atenció. La Sofia Marchetti (arriba dimarts) escriu que la seva mare va amb cadira de rodes i pregunta si es pot pujar a l'esmorzar del terrat. Hi ha una resposta redactada esperant: confirma que l'ascensor arriba a la terrassa, ofereix la Doble Pati de planta baixa com a alternativa i proposa bloquejar totes dues habitacions fins divendres. Revisa-la i envia-la quan vulguis.

Els altres tres — una consulta de pàrquing, una petició de late check-out i una confirmació de reserva — també tenen esborrany a punt.`,
      rate_alert: `Aquesta nit som al 88% i el cap de setmana està pràcticament ple. El punt fluix és dijous 2 de juliol: 21 de 42 habitacions, poc habitual per a la primera setmana de juliol — l'any passat aquell dijous va tancar al 90%. Val la pena revisar la tarifa, o pensar una oferta entre setmana, abans del cap de setmana.`,
    },
    overnight: `Aquesta nit, Fondas ha creuat quatre correus amb les seves reserves i n'ha redactat les respostes, ha reclamat tres hores d'arribada sense confirmar, ha vigilat l'ocupació dels propers 14 dies i ha escrit aquest resum. El teu matí comença aquí.`,
  },
};
