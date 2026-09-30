-- Concurrency guard for AXXES Office.
--
-- Every accepted write bumps this counter, and the editor sends the version it
-- loaded. Without it, two people in one document means the second autosave wins
-- and the first person's paragraph disappears with no warning and no trace.
ALTER TABLE "office_documents" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
