import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PedidoComercialEstatus } from "../constants/pedido-comercial-estatus.enum.js";
import type { Usuario } from "./usuario.entity.js";

@Entity({ name: "pedidos_comerciales" })
export class PedidoComercial {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "cliente_nombre", type: "nvarchar", length: 160 })
  clienteNombre!: string;

  @Column({ type: "nvarchar", length: 2000, nullable: true })
  detalle!: string | null;

  /** Fecha del pedido (YYYY-MM-DD wall clock) */
  @Column({ name: "fecha_pedido", type: "nvarchar", length: 10 })
  fechaPedido!: string;

  @Column({
    type: "nvarchar",
    length: 30,
    default: PedidoComercialEstatus.BORRADOR,
  })
  estatus!: PedidoComercialEstatus;

  @Column({ name: "vendedor_id", type: "int" })
  vendedorId!: number;

  @ManyToOne("Usuario", { nullable: false })
  @JoinColumn({ name: "vendedor_id" })
  vendedor!: Usuario;

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;

  @Column({ name: "updated_at", type: "datetime2" })
  updatedAt!: Date;

  /** Hora del device al pasar a capturado (wall clock). */
  @Column({ name: "capturado_at", type: "datetime2", nullable: true })
  capturadoAt!: Date | null;

  /** Hora del device al pasar a prefacturado (wall clock). */
  @Column({ name: "prefacturado_at", type: "datetime2", nullable: true })
  prefacturadoAt!: Date | null;

  /** Hora del device al pasar a facturado (wall clock). */
  @Column({ name: "facturado_at", type: "datetime2", nullable: true })
  facturadoAt!: Date | null;

  /**
   * El vendedor cambió productos/cantidades estando en prefactura.
   * El facturista debe revisar (y el candado de facturar lo avisa).
   */
  @Column({ name: "requiere_revision", type: "bit", default: false })
  requiereRevision!: boolean;

  /** Hora del device del último cambio del vendedor en prefactura. */
  @Column({ name: "modificado_en_prefactura_at", type: "datetime2", nullable: true })
  modificadoEnPrefacturaAt!: Date | null;
}
