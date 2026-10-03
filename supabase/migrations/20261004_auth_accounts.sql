-- Run after db/schema.sql in the Supabase SQL Editor or through Supabase CLI migrations.
-- A confirmed or unconfirmed Auth identity gets one account row. Only a verified
-- Supabase session can join; Auth confirmation prevents unverified identities.
CREATE OR REPLACE FUNCTION public.handle_fair_drop_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  label text;
BEGIN
  label := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    split_part(COALESCE(NEW.email, 'buyer'), '@', 1)
  ) || '-' || left(NEW.id::text, 6);

  INSERT INTO public.demo_accounts (id, display_name, role, auth_kind)
  VALUES (NEW.id::text, label, 'buyer', 'SUPABASE')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_fair_drop_auth_user_created ON auth.users;
CREATE TRIGGER on_fair_drop_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_fair_drop_auth_user();

REVOKE ALL ON FUNCTION public.handle_fair_drop_auth_user() FROM PUBLIC, anon, authenticated;
