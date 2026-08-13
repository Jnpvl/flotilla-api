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
