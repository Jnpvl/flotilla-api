-- Configuración de asistencia + festivos.
-- Ejecutar en la BD de Flotilla si DB_SYNC=false.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'asistencia_config')
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
    0, N'13:00', N'14:00', SYSUTCDATETIME()
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'asistencia_festivos')
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
