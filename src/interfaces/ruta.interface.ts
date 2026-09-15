import type { PedidoEstatus } from "../constants/pedido-estatus.enum.js";
import type { RutaEstatus } from "../constants/ruta-estatus.enum.js";

export interface IniciarRutaDto {
  choferId: number;
  pedidoIds: number[];
  almacenId?: number;
}

export interface FinalizarRutaDto {
  kmRecorridos?: number;
}

export interface CreateGpsSenalDto {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  recordedAt?: string;
  tipo: string;
  pedidoId?: number | null;
  label?: string | null;
}

export interface RutaPedidoPublic {
  id: number;
  pedidoId: number;
  lugarEntrega: string;
  estatus: PedidoEstatus;
  ordenEntrega: number;
}

export interface RutaGpsPoint {
  id: number;
  lat: number;
  lng: number;
  recordedAt: string;
  speed: number | null;
  tipo: string;
  pedidoId: number | null;
  label: string | null;
}

export interface RutaPublic {
  id: number;
  choferId: number;
  choferNombre: string | null;
  almacenId: number;
  almacenNombre: string | null;
  estatus: RutaEstatus;
  kmRecorridos: number;
  pedidos: RutaPedidoPublic[];
  iniciadaAt: string | null;
  finalizadaAt: string | null;
  createdAt: string;
  updatedAt: string;
  duracionMinutos: number | null;
  gps?: RutaGpsPoint[];
}


export interface RutaListQuery {
  page?: number;
  pageSize?: number;
  /** Día `YYYY-MM-DD` (sin hora). Filtra por iniciadaAt o, si no hay, createdAt. */
  fecha?: string;
  /** Atajo: filtra por el día local del cliente. */
  hoy?: boolean;
}

export interface RutaListResult {
  items: RutaPublic[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  rutasTotales: number;
  rutasHoy: number;
  rutasActivas: number;
  kmTotales: number;
  kmHoy: number;
  promedioMinutosRuta: number | null;
  pedidosPendientes: number;
  pedidosEnRuta: number;
  pedidosEntregadosHoy: number;
  choferesActivosHoy: number;
}
