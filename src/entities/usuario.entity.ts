import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RolUsuario } from "../constants/rol.enum.js";

@Entity({ name: "usuarios" })
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "nvarchar", length: 120 })
  nombre!: string;

  @Column({ type: "nvarchar", length: 80, unique: true })
  username!: string;

  @Column({ type: "nvarchar", length: 255 })
  password!: string;

  @Column({ type: "nvarchar", length: 20 })
  rol!: RolUsuario;

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;

  @Column({ name: "updated_at", type: "datetime2" })
  updatedAt!: Date;
}
