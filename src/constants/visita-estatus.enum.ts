/** Flujo: planeada → visitada (app) | cancelada (panel, con motivo) */
export enum VisitaEstatus {
  PLANEADA = "planeada",
  VISITADA = "visitada",
  CANCELADA = "cancelada",
}

/** Valores legacy en BD que se normalizan a cancelada. */
export const VISITA_ESTATUS_LEGACY_OMITIDA = "omitida";
