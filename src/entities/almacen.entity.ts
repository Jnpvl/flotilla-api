import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { Ruta } from "./ruta.entity.js";

@Entity({ name: "almacenes" })
export class Almacen {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "nvarchar", length: 120 })
  nombre!: string;

  @Column({ type: "nvarchar", length: 255, default: "" })
  direccion!: string;

  @Column({ type: "decimal", precision: 10, scale: 7, default: 0 })
  lat!: string;

  @Column({ type: "decimal", precision: 10, scale: 7, default: 0 })
  lng!: string;

  @Column({ name: "radio_metros", type: "int", default: 100 })
  radioMetros!: number;

  @OneToMany("Ruta", "almacen")
  rutas!: Ruta[];

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;

  @Column({ name: "updated_at", type: "datetime2" })
  updatedAt!: Date;
}
