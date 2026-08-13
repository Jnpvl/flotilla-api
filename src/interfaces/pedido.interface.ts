import type { PedidoEstatus } from "../constants/pedido-estatus.enum.js";

export interface CreatePedidoDto {
  lugarEntrega: string;
  creadoPorId: number;
}

export interface UpdatePedidoDto {
  lugarEntrega?: string;
  estatus?: PedidoEstatus;
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
