import { Usuario } from "./usuario.entity.js";
import { Almacen } from "./almacen.entity.js";
import { Pedido } from "./pedido.entity.js";
import { PedidoComercial } from "./pedido-comercial.entity.js";
import { Visita } from "./visita.entity.js";
import { Ruta } from "./ruta.entity.js";
import { RutaPedido } from "./ruta-pedido.entity.js";
import { GpsSenal } from "./gps-senal.entity.js";
import { Asistencia } from "./asistencia.entity.js";
import { AsistenciaConfig } from "./asistencia-config.entity.js";
import { AsistenciaFestivo } from "./asistencia-festivo.entity.js";

export {
  Usuario,
  Almacen,
  Pedido,
  PedidoComercial,
  Visita,
  Ruta,
  RutaPedido,
  GpsSenal,
  Asistencia,
  AsistenciaConfig,
  AsistenciaFestivo,
};

export const ENTITIES = [
  Usuario,
  Almacen,
  Pedido,
  PedidoComercial,
  Visita,
  Ruta,
  RutaPedido,
  GpsSenal,
  Asistencia,
  AsistenciaConfig,
  AsistenciaFestivo,
];
