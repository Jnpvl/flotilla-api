import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { VisitaEstatus } from "../constants/visita-estatus.enum.js";
import type { Usuario } from "./usuario.entity.js";

@Entity({ name: "visitas" })
export class Visita {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "vendedor_id", type: "int" })
  vendedorId!: number;

  @ManyToOne("Usuario", { nullable: false })
  @JoinColumn({ name: "vendedor_id" })
  vendedor!: Usuario;

  @Column({ name: "cliente_nombre", type: "nvarchar", length: 160 })
  clienteNombre!: string;

  /** Fecha planificada YYYY-MM-DD */
  @Column({ name: "fecha_planificada", type: "nvarchar", length: 10 })
  fechaPlanificada!: string;

  /** Hora opcional HH:mm */
  @Column({ name: "hora_planificada", type: "nvarchar", length: 5, nullable: true })
  horaPlanificada!: string | null;

  @Column({ type: "nvarchar", length: 500, nullable: true })
  notas!: string | null;

  @Column({
    type: "nvarchar",
    length: 20,
    default: VisitaEstatus.PLANEADA,
  })
  estatus!: VisitaEstatus;

  @Column({ name: "visitada_at", type: "datetime2", nullable: true })
  visitadaAt!: Date | null;

  @Column({ type: "nvarchar", length: 40, nullable: true })
  lat!: string | null;

  @Column({ type: "nvarchar", length: 40, nullable: true })
  lng!: string | null;

  @Column({ type: "float", nullable: true })
  accuracy!: number | null;

  /** Desde dónde se registró visitada/cancelada: mobile | web */
  @Column({ name: "origen_registro", type: "nvarchar", length: 10, nullable: true })
  origenRegistro!: string | null;

  @Column({ name: "notas_visita", type: "nvarchar", length: 500, nullable: true })
  notasVisita!: string | null;

  /** Al marcar visitada: si se generó pedido. */
  @Column({ name: "hizo_pedido", type: "bit", nullable: true })
  hizoPedido!: boolean | null;

  /** Al marcar visitada: si promocionaron algo. */
  @Column({ type: "bit", nullable: true })
  promociono!: boolean | null;

  /** Productos promocionados (obligatorio si promociono = true). */
  @Column({ name: "productos_promocion", type: "nvarchar", length: 500, nullable: true })
  productosPromocion!: string | null;

  /** Motivo de cancelación o de eliminación. */
  @Column({ type: "nvarchar", length: 500, nullable: true })
  motivo!: string | null;

  /** Soft-delete: si tiene valor, no aparece en listados. */
  @Column({ name: "eliminada_at", type: "datetime2", nullable: true })
  eliminadaAt!: Date | null;

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;

  @Column({ name: "updated_at", type: "datetime2" })
  updatedAt!: Date;
}
