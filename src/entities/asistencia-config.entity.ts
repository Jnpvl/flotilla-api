import { Column, Entity, PrimaryColumn } from "typeorm";

/** Configuración única de asistencia (siempre id = 1). */
@Entity({ name: "asistencia_config" })
export class AsistenciaConfig {
  @PrimaryColumn({ type: "int" })
  id!: number;

  /** Hora de entrada esperada HH:mm */
  @Column({ name: "entrada_esperada", type: "nvarchar", length: 5 })
  entradaEsperada!: string;

  /** Minutos de tolerancia antes de marcar retardo. */
  @Column({ name: "tolerancia_retardo_min", type: "int" })
  toleranciaRetardoMin!: number;

  /** Hora de salida esperada HH:mm */
  @Column({ name: "salida_esperada", type: "nvarchar", length: 5 })
  salidaEsperada!: string;

  /**
   * Días laborales: CSV de weekday JS (0=dom … 6=sáb).
   * Default Lun–Vie: "1,2,3,4,5"
   */
  @Column({ name: "dias_laborales", type: "nvarchar", length: 32 })
  diasLaborales!: string;

  /** Si true, mobile exige marcar inicio/fin de comida. */
  @Column({ name: "exige_comida", type: "bit", default: false })
  exigeComida!: boolean;

  /** Hora esperada inicio comida HH:mm */
  @Column({
    name: "comida_inicio_esperada",
    type: "nvarchar",
    length: 5,
    nullable: true,
  })
  comidaInicioEsperada!: string | null;

  /** Hora esperada fin comida HH:mm */
  @Column({
    name: "comida_fin_esperada",
    type: "nvarchar",
    length: 5,
    nullable: true,
  })
  comidaFinEsperada!: string | null;

  @Column({ name: "updated_at", type: "datetime2" })
  updatedAt!: Date;
}
