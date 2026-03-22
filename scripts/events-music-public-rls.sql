-- Run in Supabase → SQL (after your existing `events` table).
-- Lets the static site read published music events with the anon key.
--
-- The Music page filters with .eq('is_published', true) and .eq('category', 'music').
-- Columns should be real boolean / text. If `is_published` is text, convert e.g.:
--   alter table public.events alter column is_published type boolean using (is_published::boolean);

-- Optional: extra photos beyond `events.image_url` (detail page gallery).
create table if not exists public.event_gallery_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_gallery_images_event_sort_idx
  on public.event_gallery_images (event_id, sort_order);

alter table public.events enable row level security;
alter table public.event_gallery_images enable row level security;

-- Anonymous + logged-in visitors: only published music events
drop policy if exists "Public read published music events" on public.events;
create policy "Public read published music events"
  on public.events
  for select
  to anon, authenticated
  using (is_published = true and category = 'music');

drop policy if exists "Public read gallery for published music events" on public.event_gallery_images;
create policy "Public read gallery for published music events"
  on public.event_gallery_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_gallery_images.event_id
        and e.is_published = true
        and e.category = 'music'
    )
  );

-- Logged-in users (e.g. ticket dashboard): full access so you can still create/edit events.
-- Remove this policy if you only want the service role to mutate rows.
drop policy if exists "Authenticated full access events" on public.events;
create policy "Authenticated full access events"
  on public.events
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated full access event gallery" on public.event_gallery_images;
create policy "Authenticated full access event gallery"
  on public.event_gallery_images
  for all
  to authenticated
  using (true)
  with check (true);
