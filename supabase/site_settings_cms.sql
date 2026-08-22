-- Site settings fields used by the landing page CMS.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS footer_description text;
