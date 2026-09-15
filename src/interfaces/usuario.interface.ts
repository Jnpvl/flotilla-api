import type { RolUsuario } from "../constants/rol.enum.js";

export interface CreateUsuarioDto {
  nombre: string;
  username: string;
  password: string;
  rol: RolUsuario;
  /** CIDAGENTE Contpaq; requerido si rol = vendedor. */
  agenteContpaqId?: number | null;
}

export interface UpdateUsuarioDto {
  nombre?: string;
  username?: string;
  password?: string;
  rol?: RolUsuario;
  agenteContpaqId?: number | null;
}

export interface UsuarioPublic {
  id: number;
  nombre: string;
  username: string;
  rol: RolUsuario;
  agenteContpaqId: number | null;
  createdAt: string;
  updatedAt: string;
}
