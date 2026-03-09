-- ============================================================
-- Migration 002 — Policies RLS pour la gestion admin des membres
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Permet à un platform_admin de lire tous les membres de toutes les orgs
CREATE POLICY "admin_read_all_members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (is_platform_admin());

-- Permet à un platform_admin de modifier les membres (rôle, suppression)
CREATE POLICY "admin_manage_members"
  ON organization_members FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Permet à un platform_admin de renommer les organisations
CREATE POLICY "admin_update_organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Permet à un platform_admin de créer des codes d'invitation pour n'importe quelle org
CREATE POLICY "admin_manage_invite_codes"
  ON invite_codes FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
