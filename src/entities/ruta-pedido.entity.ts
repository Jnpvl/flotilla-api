import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import type { Ruta } from "./ruta.entity.js";
import type { Pedido } from "./pedido.entity.js";

@Entity({ name: "ruta_pedidos" })
@Unique(["rutaId", "pedidoId"])
export class RutaPedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "ruta_id", type: "int" })
  rutaId!: number;

  @ManyToOne("Ruta", "rutaPedidos", { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "ruta_id" })
  ruta!: Ruta;

  @Column({ name: "pedido_id", type: "int" })
  pedidoId!: number;

  @ManyToOne("Pedido", "rutaPedidos", { nullable: false })
  @JoinColumn({ name: "pedido_id" })
  pedido!: Pedido;

  @Column({ name: "orden_entrega", type: "int" })
  ordenEntrega!: number;

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;
}
