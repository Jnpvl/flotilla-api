/** Flujo: borrador → capturado → prefacturado → facturado */
export enum PedidoComercialEstatus {
  BORRADOR = "borrador",
  CAPTURADO = "capturado",
  /** @deprecated usar prefacturado; se mantiene por datos antiguos */
  EN_FACTURACION = "en_facturacion",
  PREFACTURADO = "prefacturado",
  FACTURADO = "facturado",
}
