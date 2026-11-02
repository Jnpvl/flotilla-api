export type AsistenciaOrigen = "mobile" | "web";

/** Tipos de checada que puede pedir la config. */
export type AsistenciaChecadaTipo =
  | "entrada"
  | "comida_inicio"
  | "comida_fin"
  | "salida";

/** Estatus derivado de config (entrada/salida esperada + tolerancia). */
export type AsistenciaEstatus =
  | "a_tiempo"
  | "retardo"
  | "sin_salida"
  | "salida_temprana";

export type AsistenciaPunchDto = {
  lat?: number;
  lng?: number;
  accuracy?: number;
  origen?: AsistenciaOrigen;
  /** Si true, exige lat/lng (mobile). */
  requireGeo?: boolean;
};

export type AsistenciaListQuery = {
  fecha?: string;
  desde?: string;
  hasta?: string;
  usuarioId?: number;
};

export type AsistenciaPublic = {
  id: number;
  usuarioId: number;
  usuarioNombre: string | null;
  usuarioRol: string | null;
  fecha: string;
  entradaAt: string | null;
  entradaLat: number | null;
  entradaLng: number | null;
  entradaAccuracy: number | null;
  origenEntrada: AsistenciaOrigen | null;
  comidaInicioAt: string | null;
  comidaInicioLat: number | null;
  comidaInicioLng: number | null;
  comidaInicioAccuracy: number | null;
  origenComidaInicio: AsistenciaOrigen | null;
  comidaFinAt: string | null;
  comidaFinLat: number | null;
  comidaFinLng: number | null;
  comidaFinAccuracy: number | null;
  origenComidaFin: AsistenciaOrigen | null;
  salidaAt: string | null;
  salidaLat: number | null;
  salidaLng: number | null;
  salidaAccuracy: number | null;
  origenSalida: AsistenciaOrigen | null;
  /** Derivado con la config vigente. */
  estatus: AsistenciaEstatus | null;
  createdAt: string;
  updatedAt: string;
};

export type AsistenciaReglasPublic = {
  entradaEsperada: string;
  toleranciaRetardoMin: number;
  salidaEsperada: string;
  exigeComida: boolean;
  comidaInicioEsperada: string | null;
  comidaFinEsperada: string | null;
  /** Orden de checadas que mobile debe mostrar/completar. */
  checadas: AsistenciaChecadaTipo[];
};

/** Estado del día para el usuario autenticado. */
export type AsistenciaHoyPublic = {
  fecha: string;
  asistencia: AsistenciaPublic | null;
  reglas: AsistenciaReglasPublic;
  /**
   * Checadas permitidas ahora.
   * Si comida es opcional: tras entrada pueden ser [comida_inicio, salida].
   */
  opciones: AsistenciaChecadaTipo[];
  /** Primera opción sugerida (compat / botón principal). */
  siguiente: AsistenciaChecadaTipo | null;
  diaNoLaboral: boolean;
  puedeEntrada: boolean;
  puedeSalida: boolean;
};

export type AsistenciaConfigPublic = {
  entradaEsperada: string;
  toleranciaRetardoMin: number;
  salidaEsperada: string;
  /** Weekdays JS: 0=dom … 6=sáb */
  diasLaborales: number[];
  exigeComida: boolean;
  comidaInicioEsperada: string | null;
  comidaFinEsperada: string | null;
  /** Orden de checadas derivado. */
  checadas: AsistenciaChecadaTipo[];
};

export type UpdateAsistenciaConfigDto = {
  entradaEsperada?: string;
  toleranciaRetardoMin?: number;
  salidaEsperada?: string;
  diasLaborales?: number[];
  exigeComida?: boolean;
  comidaInicioEsperada?: string | null;
  comidaFinEsperada?: string | null;
};

export type AsistenciaFestivoPublic = {
  id: number;
  fecha: string;
  nombre: string | null;
  createdAt: string;
};

export type CreateAsistenciaFestivoDto = {
  fecha: string;
  nombre?: string | null;
};
