create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
create policy "public can read visible categories" on public.categories for select using (is_visible = true);

insert into public.categories (name, slug)
values ('أدوات مطبخ', 'kitchen-tools'), ('تنظيم وتخزين', 'storage-organization'), ('أثاث', 'furniture')
on conflict (slug) do nothing;

alter table public.site_settings add column if not exists address text;
