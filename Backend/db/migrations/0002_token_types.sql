-- Migración: tipos de token (verify-email y reset-password)
-- La columna `type` distingue el propósito de cada token guardado. El token de
-- login no se guarda (stateless, en cookie). Las filas existentes son de
-- verificación, por eso el valor por defecto es 'verify-email'.
-- Aplicar sobre la BD existente con:
--   npx wrangler d1 execute evoruna --remote --file=db/migrations/0002_token_types.sql

ALTER TABLE verification_tokens ADD COLUMN type TEXT NOT NULL DEFAULT 'verify-email';
