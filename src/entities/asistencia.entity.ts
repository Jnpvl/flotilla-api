import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import type { Usuario } from "./usuario.entity.js";

@Entity({ name: "asistencias" })
@Unique("UQ_asistencias_usuario_fecha", ["usuarioId", "fecha"])
@Index(["fecha"])
export class Asistencia {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "usuario_id", type: "int" })
  usuarioId!: number;

  @ManyToOne("Usuario", { nullable: false })
  @JoinColumn({ name: "usuario_id" })
  usuario!: Usuario;

  /** Día laboral YYYY-MM-DD (wall clock del device). */
  @Column({ type: "nvarchar", length: 10 })
  fecha!: string;

  @Column({ name: "entrada_at", type: "datetime2", nullable: true })
  entradaAt!: Date | null;

  @Column({ name: "entrada_lat", type: "nvarchar", length: 40, nullable: true })
  entradaLat!: string | null;

  @Column({ name: "entrada_lng", type: "nvarchar", length: 40, nullable: true })
  entradaLng!: string | null;

  @Column({ name: "entrada_accuracy", type: "float", nullable: true })
  entradaAccuracy!: number | null;

  /** mobile | web */
  @Column({ name: "origen_entrada", type: "nvarchar", length: 10, nullable: true })
  origenEntrada!: string | null;

  @Column({ name: "comida_inicio_at", type: "datetime2", nullable: true })
  comidaInicioAt!: Date | null;

  @Column({
    name: "comida_inicio_lat",
    type: "nvarchar",
    length: 40,
    nullable: true,
  })
  comidaInicioLat!: string | null;

  @Column({
    name: "comida_inicio_lng",
    type: "nvarchar",
    length: 40,
    nullable: true,
  })
  comidaInicioLng!: string | null;

  @Column({ name: "comida_inicio_accuracy", type: "float", nullable: true })
  comidaInicioAccuracy!: number | null;

  @Column({
    name: "origen_comida_inicio",
    type: "nvarchar",
    length: 10,
    nullable: true,
  })
  origenComidaInicio!: string | null;

  @Column({ name: "comida_fin_at", type: "datetime2", nullable: true })
  comidaFinAt!: Date | null;

  @Column({
    name: "comida_fin_lat",
    type: "nvarchar",
    length: 40,
    nullable: true,
  })
  comidaFinLat!: string | null;

  @Column({
    name: "comida_fin_lng",
    type: "nvarchar",
    length: 40,
    nullable: true,
  })
  comidaFinLng!: string | null;

  @Column({ name: "comida_fin_accuracy", type: "float", nullable: true })
  comidaFinAccuracy!: number | null;

  @Column({
    name: "origen_comida_fin",
    type: "nvarchar",
    length: 10,
    nullable: true,
  })
  origenComidaFin!: string | null;

  @Column({ name: "salida_at", type: "datetime2", nullable: true })
  salidaAt!: Date | null;

  @Column({ name: "salida_lat", type: "nvarchar", length: 40, nullable: true })
  salidaLat!: string | null;

  @Column({ name: "salida_lng", type: "nvarchar", length: 40, nullable: true })
  salidaLng!: string | null;

  @Column({ name: "salida_accuracy", type: "float", nullable: true })
  salidaAccuracy!: number | null;

  /** mobile | web */
  @Column({ name: "origen_salida", type: "nvarchar", length: 10, nullable: true })
  origenSalida!: string | null;

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;

  @Column({ name: "updated_at", type: "datetime2" })
  updatedAt!: Date;
}
