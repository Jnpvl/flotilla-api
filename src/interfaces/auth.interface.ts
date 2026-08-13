import type { RolUsuario } from "../constants/rol.enum.js";

export interface LoginDto {
  username: string;
  password: string;
}

export interface JwtPayload {
  sub: number;
  username: string;
  rol: RolUsuario;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    nombre: string;
    username: string;
    rol: RolUsuario;
  };
}
