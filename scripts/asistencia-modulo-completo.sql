/*
  Módulo de asistencia — script final (SQL Server)
  Idempotente: se puede correr en servidor limpio o si ya hay tablas parciales.

  Incluye:
  - dbo.asistencias (entrada / comida opcional / salida + GPS)
  - dbo.asistencia_config (horarios, tolerancia, días laborales, permite comida)
  - dbo.asistencia_festivos
*/

/* ========== asistencias ========== */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'asistencias' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.asistencias (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha NVARCHAR(10) NOT NULL,
    entrada_at DATETIME2 NULL,
    entrada_lat NVARCHAR(40) NULL,
    entrada_lng NVARCHAR(40) NULL,
    entrada_accuracy FLOAT NULL,
    origen_entrada NVARCHAR(10) NULL,
    comida_inicio_at DATETIME2 NULL,
    comida_inicio_lat NVARCHAR(40) NULL,
    comida_inicio_lng NVARCHAR(40) NULL,
    comida_inicio_accuracy FLOAT NULL,
    origen_comida_inicio NVARCHAR(10) NULL,
    comida_fin_at DATETIME2 NULL,
    comida_fin_lat NVARCHAR(40) NULL,
    comida_fin_lng NVARCHAR(40) NULL,
    comida_fin_accuracy FLOAT NULL,
    origen_comida_fin NVARCHAR(10) NULL,
    salida_at DATETIME2 NULL,
    salida_lat NVARCHAR(40) NULL,
    salida_lng NVARCHAR(40) NULL,
    salida_accuracy FLOAT NULL,
    origen_salida NVARCHAR(10) NULL,
    created_at DATETIME2 NOT NULL,
    updated_at DATETIME2 NOT NULL,
    CONSTRAINT FK_asistencias_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios(id),
    CONSTRAINT UQ_asistencias_usuario_fecha UNIQUE (usuario_id, fecha)
  );

  CREATE INDEX IX_asistencias_fecha ON dbo.asistencias (fecha);
END
GO

/* Si la tabla ya existía sin columnas de comida */
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

/* ========== asistencia_config ========== */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'asistencia_config' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.asistencia_config (
    id INT NOT NULL PRIMARY KEY,
    entrada_esperada NVARCHAR(5) NOT NULL,
    tolerancia_retardo_min INT NOT NULL,
    salida_esperada NVARCHAR(5) NOT NULL,
    dias_laborales NVARCHAR(32) NOT NULL,
    exige_comida BIT NOT NULL CONSTRAINT DF_asistencia_config_exige_comida DEFAULT 0,
    comida_inicio_esperada NVARCHAR(5) NULL,
    comida_fin_esperada NVARCHAR(5) NULL,
    updated_at DATETIME2 NOT NULL
  );

  INSERT INTO dbo.asistencia_config (
    id, entrada_esperada, tolerancia_retardo_min, salida_esperada, dias_laborales,
    exige_comida, comida_inicio_esperada, comida_fin_esperada, updated_at
  ) VALUES (
    1, N'08:00', 10, N'17:00', N'1,2,3,4,5',
    0, NULL, NULL, SYSUTCDATETIME()
  );
END
GO

/* Si config ya existía sin columnas de comida */
IF COL_LENGTH('dbo.asistencia_config', 'exige_comida') IS NULL
BEGIN
  ALTER TABLE dbo.asistencia_config ADD
    exige_comida BIT NOT NULL CONSTRAINT DF_asistencia_config_exige_comida DEFAULT 0,
    comida_inicio_esperada NVARCHAR(5) NULL,
    comida_fin_esperada NVARCHAR(5) NULL;

  UPDATE dbo.asistencia_config
  SET exige_comida = 0
  WHERE id = 1 AND exige_comida IS NULL;
END
GO

/* Asegura fila de config id=1 */
IF NOT EXISTS (SELECT 1 FROM dbo.asistencia_config WHERE id = 1)
BEGIN
  INSERT INTO dbo.asistencia_config (
    id, entrada_esperada, tolerancia_retardo_min, salida_esperada, dias_laborales,
    exige_comida, comida_inicio_esperada, comida_fin_esperada, updated_at
  ) VALUES (
    1, N'08:00', 10, N'17:00', N'1,2,3,4,5',
    0, NULL, NULL, SYSUTCDATETIME()
  );
END
GO

/* ========== asistencia_festivos ========== */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'asistencia_festivos' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.asistencia_festivos (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    fecha NVARCHAR(10) NOT NULL,
    nombre NVARCHAR(120) NULL,
    created_at DATETIME2 NOT NULL,
    CONSTRAINT UQ_asistencia_festivos_fecha UNIQUE (fecha)
  );
END
GO
