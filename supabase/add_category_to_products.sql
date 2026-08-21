alter table public.products
add column if not exists category text;

update public.products
set category = case
  when category is not null and btrim(category) <> '' then category
  when lower(coalesce(title, '')) ~ '(storage|تنظيم|تخزين)' then 'storage-organization'
  when lower(coalesce(title, '')) ~ '(furniture|أثاث|كرسي|طاولة|ترابيزة)' then 'furniture'
  else 'kitchen-tools'
end
where category is null or btrim(category) = '';

alter table public.products
alter column category set default 'kitchen-tools';

update public.products
set category = 'kitchen-tools'
where category is null;

