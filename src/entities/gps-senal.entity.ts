import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { GpsEvento } from "../constants/gps-evento.enum.js";
import type { Ruta } from "./ruta.entity.js";

@Entity({ name: "gps_senales" })
@Index(["rutaId", "recordedAt"])
export class GpsSenal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "ruta_id", type: "int" })
  rutaId!: number;

  @ManyToOne("Ruta", "gpsSenales", { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "ruta_id" })
  ruta!: Ruta;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  lat!: string;

  @Column({ type: "decimal", precision: 10, scale: 7 })
  lng!: string;

  @Column({ type: "float", nullable: true })
  accuracy!: number | null;

  @Column({ type: "float", nullable: true })
  speed!: number | null;

  /** tracking | inicio_ruta | pedido_entregado | regreso_almacen */
  @Column({ type: "nvarchar", length: 40, default: GpsEvento.TRACKING })
  tipo!: string;

  @Column({ name: "pedido_id", type: "int", nullable: true })
  pedidoId!: number | null;

  @Column({ type: "nvarchar", length: 200, nullable: true })
  label!: string | null;

  @Column({ name: "recorded_at", type: "datetime2" })
  recordedAt!: Date;

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;
}
