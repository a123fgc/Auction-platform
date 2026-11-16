create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

insert into public.categories (name, slug)
values
  ('Electronics','electronics'),
  ('Fashion','fashion'),
  ('Home & Garden','home-garden'),
  ('Collectibles','collectibles'),
  ('Sports','sports'),
  ('Vehicles','vehicles')
on conflict (name) do nothing;