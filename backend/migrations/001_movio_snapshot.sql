-- Tabla creada también en runtime por el backend (ensureSchema).
-- Ejecutá esto en Neon / Vercel Postgres si preferís migraciones manuales.

CREATE TABLE IF NOT EXISTS movio_snapshot (
  id INTEGER PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
