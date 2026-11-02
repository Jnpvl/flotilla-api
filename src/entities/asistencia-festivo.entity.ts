import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "asistencia_festivos" })
@Unique("UQ_asistencia_festivos_fecha", ["fecha"])
export class AsistenciaFestivo {
  @PrimaryGeneratedColumn()
  id!: number;

  /** YYYY-MM-DD */
  @Column({ type: "nvarchar", length: 10 })
  fecha!: string;

  @Column({ type: "nvarchar", length: 120, nullable: true })
  nombre!: string | null;

  @Column({ name: "created_at", type: "datetime2" })
  createdAt!: Date;
}
