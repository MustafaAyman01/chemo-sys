-- ============================================================
-- Migration: Fix role_permissions RLS (Phase 8 — RBAC)
-- Run this in Supabase SQL Editor
--
-- Problem: role_permissions had RLS enabled but no SELECT policy,
-- so non-admin users could never read their own role's permissions,
-- and the frontend Sidebar/route guards always failed closed (saw nothing).
-- ============================================================

-- Allow every authenticated user to read the permission matrix
-- (they only ever see their own profile's role applied client-side,
-- and every sensitive write is still protected by its own table's RLS policy).
CREATE POLICY "Authenticated users can read role permissions"
  ON role_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can modify the permission matrix itself
CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (get_user_role() IN ('super_admin', 'admin'));
