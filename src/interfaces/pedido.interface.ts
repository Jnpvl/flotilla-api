import type { PedidoEstatus } from "../constants/pedido-estatus.enum.js";
import type { FacturaPartida } from "./factura.interface.js";

export interface CreatePedidoDto {
  lugarEntrega?: string;
  /** admDocumentos.CIDDOCUMENTO. Si viene, el pedido se arma desde esa factura. */
  idDocumento?: number;
  creadoPorId: number;
}

export interface UpdatePedidoDto {
  lugarEntrega?: string;
  estatus?: PedidoEstatus;
  recibidoPor?: string;
  /** PNG en base64, con o sin prefijo data URL. */
  firma?: string;
  /** Un flag por partida, en el mismo orden del pedido. */
  entregados?: boolean[];
}

export interface PedidoListQuery {
  page?: number;
  pageSize?: number;
  estatus?: PedidoEstatus | "";
  q?: string;
}

export interface PedidoPublic {
  id: number;
  lugarEntrega: string;
  estatus: PedidoEstatus;
  creadoPorId: number;
  creadoPorNombre: string | null;
  rutaId: number | null;
  documentoId: number | null;
  facturaFolio: number | null;
  facturaSerie: string | null;
  facturaFecha: string | null;
  facturaUuid: string | null;
  clienteCodigo: string | null;
  clienteNombre: string | null;
  clienteRfc: string | null;
  facturaTotal: number | null;
  partidas: FacturaPartida[];
  recibidoPor: string | null;
  tieneFirma: boolean;
  /** PNG en base64. Solo viene en el detalle, no en el listado. */
  firma: string | null;
  firmadoAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PedidoListResult {
  items: PedidoPublic[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
