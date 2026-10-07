export interface FacturaPartida {
  codigoProducto: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  totalPartida: number;
  /** Lo marcó el chofer al entregar. */
  entregado?: boolean;
}

/** Factura timbrada de Contpaq (PROMAC), agrupada con sus partidas. */
export interface FacturaDocumento {
  idDocumento: number;
  factura: number;
  serie: string;
  fechaDocumento: string | null;
  totalFactura: number;
  uuid: string;
  fechaTimbrado: string | null;
  horaTimbrado: string | null;
  estadoTimbrado: number | null;
  idCliente: number | null;
  codigoCliente: string;
  cliente: string;
  rfc: string;
  partidas: FacturaPartida[];
}
