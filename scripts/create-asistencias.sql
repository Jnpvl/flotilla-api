-- Tabla de asistencia (entrada/salida por día y usuario).
-- Ejecutar en la BD de Flotilla si DB_SYNC=false.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'asistencias')
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
