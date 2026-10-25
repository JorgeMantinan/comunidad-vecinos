/**
 * Publicidad por cercanía sin geolocalización externa: el servidor
 * compara la zona del anunciante con la dirección de la finca.
 *
 * Reglas:
 * -  Se normaliza sin distinguir mayúsculas ni acentos.
 * -  La zona admite varias partes separadas por coma (`Valencia,
 *    Rusafa`): basta con que una aparezca en la dirección.
 * -  Partes demasiado cortas (< 3 caracteres) se ignoran para no
 *    emparejar por casualidad.
 * -  Sin zona o sin dirección no hay emparejamiento: la publicidad
 *    solo llega si la plataforma la asignó a mano.
 *
 * El anunciante nunca recibe la dirección ni sabe en qué comunidades
 * se muestra: el cruce ocurre únicamente en el servidor.
 */
export function zoneMatches(
  zone: string | null | undefined,
  address: string | null | undefined,
): boolean {
  if (!zone || !address) {
    return false;
  }
  const haystack = normalize(address);
  const parts = zone
    .split(/[,;/]/)
    .map((part) => normalize(part.trim()))
    .filter((part) => part.length >= 3);
  return parts.some((part) => haystack.includes(part));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
