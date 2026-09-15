export enum GpsEvento {
  INICIO_RUTA = "inicio_ruta",
  PEDIDO_ENTREGADO = "pedido_entregado",
  REGRESO_ALMACEN = "regreso_almacen",
}

const GPS_EVENTOS = new Set<string>(Object.values(GpsEvento));

export function isGpsEvento(value: unknown): value is GpsEvento {
  return typeof value === "string" && GPS_EVENTOS.has(value);
}
