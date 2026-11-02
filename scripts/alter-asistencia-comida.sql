-- Amplía asistencia: checada de comida (opcional) + columnas en config.
-- Ejecutar si las tablas ya existen (DB_SYNC=false).

IF COL_LENGTH('dbo.asistencia_config', 'exige_comida') IS NULL
BEGIN
  ALTER TABLE dbo.asistencia_config ADD
    exige_comida BIT NOT NULL CONSTRAINT DF_asistencia_config_exige_comida DEFAULT 0,
    comida_inicio_esperada NVARCHAR(5) NULL,
    comida_fin_esperada NVARCHAR(5) NULL;

  UPDATE dbo.asistencia_config
  SET
    exige_comida = 0,
    comida_inicio_esperada = N'13:00',
    comida_fin_esperada = N'14:00'
  WHERE id = 1;
END
GO

IF COL_LENGTH('dbo.asistencias', 'comida_inicio_at') IS NULL
BEGIN
  ALTER TABLE dbo.asistencias ADD
    comida_inicio_at DATETIME2 NULL,
    comida_inicio_lat NVARCHAR(40) NULL,
    comida_inicio_lng NVARCHAR(40) NULL,
    comida_inicio_accuracy FLOAT NULL,
    origen_comida_inicio NVARCHAR(10) NULL,
    comida_fin_at DATETIME2 NULL,
    comida_fin_lat NVARCHAR(40) NULL,
    comida_fin_lng NVARCHAR(40) NULL,
    comida_fin_accuracy FLOAT NULL,
    origen_comida_fin NVARCHAR(10) NULL;
END
GO
