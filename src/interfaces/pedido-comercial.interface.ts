import type { PedidoComercialEstatus } from "../constants/pedido-comercial-estatus.enum.js";

export interface CreatePedidoComercialDto {
  clienteNombre: string;
  /** Código Contpaq del cliente (opcional pero recomendado). */
  clienteCodigo?: string | null;
  detalle?: string | null;
  fechaPedido: string;
  estatus?: PedidoComercialEstatus;
  vendedorId: number;
}

export interface UpdatePedidoComercialDto {
  clienteNombre?: string;
  clienteCodigo?: string | null;
  detalle?: string | null;
  fechaPedido?: string;
  estatus?: PedidoComercialEstatus;
  /**
   * Facturista confirma que ya vio la lista de productos del vendedor
   * (obligatorio si requiereRevision está activo).
   */
  ackRevision?: boolean;
}

export interface PedidoComercialUpdateContext {
  /** Rol del usuario autenticado que hace el update. */
  actorRol?: string | undefined;
}

export interface PedidoComercialListQuery {
  page?: number;
  pageSize?: number;
  estatus?: PedidoComercialEstatus | "";
  q?: string;
  vendedorId?: number;
  /** Si true, omite pedidos en borrador (facturista). */
  excludeBorrador?: boolean;
}

export interface PedidoComercialPublic {
  id: number;
  clienteNombre: string;
  clienteCodigo: string | null;
  detalle: string | null;
  fechaPedido: string;
  estatus: PedidoComercialEstatus;
  vendedorId: number;
  vendedorNombre: string | null;
  createdAt: string;
  updatedAt: string;
  capturadoAt: string | null;
  prefacturadoAt: string | null;
  facturadoAt: string | null;
  requiereRevision: boolean;
  modificadoEnPrefacturaAt: string | null;
}

export interface PedidoComercialListResult {
  items: PedidoComercialPublic[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
