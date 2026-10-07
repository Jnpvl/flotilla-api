import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PedidoEstatus } from "../constants/pedido-estatus.enum.js";
import type { Usuario } from "./usuario.entity.js";
import type { RutaPedido } from "./ruta-pedido.entity.js";

@Entity({ name: "pedidos" })
export class Pedido {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Nombre del lugar donde se debe entregar */
  @Column({ name: "lugar_entrega", type: "nvarchar", length: 160 })
  lugarEntrega!: string;

  /** admDocumentos.CIDDOCUMENTO de la factura Contpaq. */
  @Column({ name: "documento_id", type: "int", nullable: true })
  documentoId!: number | null;

  @Column({ name: "factura_folio", type: "int", nullable: true })
  facturaFolio!: number | null;

  @Column({ name: "factura_serie", type: "nvarchar", length: 30, nullable: true })
  facturaSerie!: string | null;

  /** Fecha del documento en reloj de pared (yyyy-mm-dd hh:mi:ss). */
  @Column({ name: "factura_fecha", type: "nvarchar", length: 30, nullable: true })
  facturaFecha!: string | null;

  @Column({ name: "factura_uuid", type: "nvarchar", length: 40, nullable: true })
  facturaUuid!: string | null;

  @Column({ name: "cliente_codigo", type: "nvarchar", length: 40, nullable: true })
  clienteCodigo!: string | null;

  @Column({ name: "cliente_nombre", type: "nvarchar", length: 200, nullable: true })
  clienteNombre!: string | null;

  @Column({ name: "cliente_rfc", type: "nvarchar", length: 20, nullable: true })
  clienteRfc!: string | null;

  @Column({
    name: "factura_total",
    type: "decimal",
    precision: 18,
    scale: 6,
    nullable: true,
  })
  facturaTotal!: string | null;

  /** Partidas de la factura (JSON). */
  @Column({ name: "partidas", type: "nvarchar", length: "max", nullable: true })
  partidas!: string | null;

  /** Nombre de la persona que recibe la entrega. */
  @Column({ name: "recibido_por", type: "nvarchar", length: 120, nullable: true })
  recibidoPor!: string | null;

  /** Firma del receptor, PNG en base64. */
  @Column({ name: "firma", type: "nvarchar", length: "max", nullable: true })
  firma!: string | null;

  @Column({ name: "firmado_at", type: "datetime2", nullable: true })
  firmadoAt!: Date | null;

  @Column({
    type: "nvarchar",
    length: 30,
    default: PedidoEstatus.LISTO_PARA_ENTREGAR,
  })
  estatus!: PedidoEstatus;

  @Column({ name: "creado_por_id", type: "int" })
  creadoPorId!: number;

  @ManyToOne("Usuario", { nullable: false })
  @JoinColumn({ name: "creado_por_id" })
  creadoPor!: Usuario;

  @OneToMany("RutaPedido", "pedido")
  rutaPedidos!: RutaPedido[];

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;

  @Column({ name: "updated_at", type: "datetime2" })
  updatedAt!: Date;
}
