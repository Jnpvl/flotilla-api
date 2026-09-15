import type { VisitaEstatus } from "../constants/visita-estatus.enum.js";

export type VisitaOrigenRegistro = "mobile" | "web";

export interface CreateVisitaDto {
  clienteNombre: string;
  fechaPlanificada: string;
  horaPlanificada?: string | null;
  notas?: string | null;
  vendedorId: number;
}

export interface UpdateVisitaDto {
  clienteNombre?: string;
  fechaPlanificada?: string;
  horaPlanificada?: string | null;
  notas?: string | null;
}

export interface CheckInVisitaDto {
  lat?: number;
  lng?: number;
  accuracy?: number;
  notasVisita?: string | null;
  origen?: VisitaOrigenRegistro;
  /** ¿Le hicieron pedido? (obligatorio al marcar visitada). */
  hizoPedido: boolean;
  /** ¿Promocionaron algo? */
  promociono: boolean;
  /** Obligatorio si promociono = true. */
  productosPromocion?: string | null;
  /** Solo visitada desde la app; cancelada va por /cancelar. */
  estatus?: VisitaEstatus.VISITADA;
}

export interface CancelarVisitaDto {
  motivo: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  origen?: VisitaOrigenRegistro;
}

export interface EliminarVisitaDto {
  motivo: string;
}

export interface VisitaListQuery {
  fecha?: string;
  desde?: string;
  hasta?: string;
  vendedorId?: number;
  estatus?: VisitaEstatus | "";
}

export interface VisitaPublic {
  id: number;
  vendedorId: number;
  vendedorNombre: string | null;
  clienteNombre: string;
  fechaPlanificada: string;
  horaPlanificada: string | null;
  notas: string | null;
  estatus: VisitaEstatus;
  visitadaAt: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  origenRegistro: VisitaOrigenRegistro | null;
  notasVisita: string | null;
  hizoPedido: boolean | null;
  promociono: boolean | null;
  productosPromocion: string | null;
  motivo: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VisitaPublicOptions = {
  /** Si no es admin, se ocultan hora/ubicación/origen de registro. */
  includeCheckInDetail?: boolean;
};
