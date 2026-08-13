import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RutaEstatus } from "../constants/ruta-estatus.enum.js";
import type { Usuario } from "./usuario.entity.js";
import type { Almacen } from "./almacen.entity.js";
import type { RutaPedido } from "./ruta-pedido.entity.js";
import type { GpsSenal } from "./gps-senal.entity.js";

@Entity({ name: "rutas" })
export class Ruta {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "chofer_id", type: "int" })
  choferId!: number;

  @ManyToOne("Usuario", { nullable: false })
  @JoinColumn({ name: "chofer_id" })
  chofer!: Usuario;

  @Column({ name: "almacen_id", type: "int" })
  almacenId!: number;

  @ManyToOne("Almacen", "rutas", { nullable: false })
  @JoinColumn({ name: "almacen_id" })
  almacen!: Almacen;

  @Column({ type: "nvarchar", length: 30, default: RutaEstatus.CREADA })
  estatus!: RutaEstatus;

  @OneToMany("RutaPedido", "ruta")
  rutaPedidos!: RutaPedido[];

  @OneToMany("GpsSenal", "ruta")
  gpsSenales!: GpsSenal[];

  @Column({
    name: "km_recorridos",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  kmRecorridos!: string;

  @Column({ name: "iniciada_at", type: "datetime2", nullable: true })
  iniciadaAt!: Date | null;

  @Column({ name: "finalizada_at", type: "datetime2", nullable: true })
  finalizadaAt!: Date | null;

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;

  @Column({ name: "updated_at", type: "datetime2" })
  updatedAt!: Date;
}
