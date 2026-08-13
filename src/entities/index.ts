import { Usuario } from "./usuario.entity.js";
import { Almacen } from "./almacen.entity.js";
import { Pedido } from "./pedido.entity.js";
import { Ruta } from "./ruta.entity.js";
import { RutaPedido } from "./ruta-pedido.entity.js";
import { GpsSenal } from "./gps-senal.entity.js";

export {
  Usuario,
  Almacen,
  Pedido,
  Ruta,
  RutaPedido,
  GpsSenal,
};

export const ENTITIES = [
  Usuario,
  Almacen,
  Pedido,
  Ruta,
  RutaPedido,
  GpsSenal,
];
