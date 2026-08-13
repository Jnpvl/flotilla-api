import type { RolUsuario } from "../constants/rol.enum.js";

export interface CreateUsuarioDto {
  nombre: string;
  username: string;
  password: string;
  rol: RolUsuario;
}

export interface UpdateUsuarioDto {
  nombre?: string;
  username?: string;
  password?: string;
  rol?: RolUsuario;
}

export interface UsuarioPublic {
  id: number;
  nombre: string;
  username: string;
  rol: RolUsuario;
  createdAt: string;
  updatedAt: string;
}
