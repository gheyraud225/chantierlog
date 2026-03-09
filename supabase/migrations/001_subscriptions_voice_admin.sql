-- ============================================================
-- Migration 001 — Abonnements, Notes vocales, Admin plateforme
-- À exécuter dans l'éditeur SQL Supabase (Settings > SQL Editor)
-- ============================================================

-- ── 1. Plans d'abonnement ────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL UNIQUE,
  label            text NOT NULL,
  max_projects     integer NOT NULL DEFAULT 3,    -- -1 = illimité
  max_photos_per_log integer NOT NULL DEFAULT 3,
  max_members      integer NOT NULL DEFAULT 5,    -- -1 = illimité
  ai_summary       boolean NOT NULL DEFAULT false,
  pdf_export       boolean NOT NULL DEFAULT false,
  custom_fields    boolean NOT NULL DEFAULT false,
  voice_notes      boolean NOT NULL DEFAULT false,
  price_monthly    numeric(10,2) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Plans par défaut
INSERT INTO subscription_plans (name, label, max_projects, max_photos_per_log, max_members, ai_summary, pdf_export, custom_fields, voice_notes, price_monthly)
VALUES
  ('free',       'Gratuit',     3,   3,   5,   false, false, false, false, 0),
  ('starter',    'Starter',     15,  5,   15,  false, true,  true,  true,  29),
  ('pro',        'Pro',         -1,  10,  -1,  true,  true,  true,  true,  79),
  ('enterprise', 'Entreprise',  -1,  20,  -1,  true,  true,  true,  true,  0)
ON CONFLICT (name) DO NOTHING;

-- ── 2. Abonnement des organisations ─────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_plan_id uuid REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS subscription_status  text NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '14 days');

-- Mettre toutes les orgs existantes sur "free" par défaut
UPDATE organizations
SET subscription_plan_id = (SELECT id FROM subscription_plans WHERE name = 'free')
WHERE subscription_plan_id IS NULL;

-- ── 3. Admins plateforme ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Notes vocales dans daily_logs ────────────────────────
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS voice_note_url        text,
  ADD COLUMN IF NOT EXISTS voice_note_transcript text,
  ADD COLUMN IF NOT EXISTS voice_note_summary    text;

-- ── 5. RLS pour les nouvelles tables ────────────────────────

-- subscription_plans : lecture publique (auth), écriture admin seulement
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plans_read"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (true);

-- platform_admins : lecture + écriture réservées aux admins eux-mêmes
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_read"
  ON platform_admins FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
  );

CREATE POLICY "platform_admins_manage"
  ON platform_admins FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()));

-- ── 6. Vue utilitaire pour l'admin ───────────────────────────
CREATE OR REPLACE VIEW admin_organizations_view AS
SELECT
  o.id,
  o.name,
  o.created_at,
  o.subscription_status,
  o.subscription_expires_at,
  o.trial_ends_at,
  sp.name   AS plan_name,
  sp.label  AS plan_label,
  sp.price_monthly,
  sp.max_projects,
  sp.max_photos_per_log,
  sp.max_members,
  sp.ai_summary,
  sp.pdf_export,
  sp.voice_notes,
  (SELECT count(*)::int FROM organization_members om WHERE om.organization_id = o.id) AS member_count,
  (SELECT count(*)::int FROM projects p WHERE p.organization_id = o.id) AS project_count,
  (SELECT om.name FROM organization_members om WHERE om.organization_id = o.id AND om.role = 'owner' LIMIT 1) AS owner_name
FROM organizations o
LEFT JOIN subscription_plans sp ON sp.id = o.subscription_plan_id;

-- Accès à la vue réservé aux admins
GRANT SELECT ON admin_organizations_view TO authenticated;

-- ── 7. Bucket Supabase Storage pour les notes vocales ────────
-- À faire manuellement dans le Dashboard Supabase :
--   Storage > New bucket > nom: "voice-notes" > Private
--   Puis ajouter la policy:
--     INSERT: auth.uid() = owner (via metadata)
--     SELECT: member de la même organisation

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
