-- Ajout du titre IA sur les notes de chantier
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS title TEXT;
