-- Migración: estado de suspensión de cuentas
-- Permite bloquear el acceso de una cuenta sin borrarla.
-- Aplicar sobre la BD existente con:
--   npx wrangler d1 execute evoruna --remote --file=db/migrations/0003_suspended.sql

ALTER TABLE users ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0;
