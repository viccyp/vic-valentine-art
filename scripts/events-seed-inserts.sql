-- Example INSERTs for `public.events` (Audio / Live Shows + event detail page).
-- Run in Supabase → SQL Editor (runs with privileges that bypass RLS).
--
-- Required for the static site:
--   category = 'music'
--   is_published = true
--
-- Columns used by the app (see src/pages/audio/*.html). If your table differs,
-- rename columns in the INSERT list or add missing columns before running.
--
-- Inspect your actual table:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'events'
--   order by ordinal_position;
--
-- `price` is integer NOT NULL. Past / archive gigs use 1 as a placeholder (£1); the site hides price
-- (and ticket counts) when the event date is in the past. Use real amounts for future shows.

insert into public.events (
  name,
  description,
  event_date,
  location,
  price,
  total_tickets,
  available_tickets,
  image_url,
  category,
  is_published
) values
  (
    'Album launch — live set',
    'Full band performance. Doors 7:30pm.',
    timestamptz '2025-04-12 19:30:00+01',
    'The Lexington, Islington, London',
    1,
    180,
    180,
    null,
    'music',
    true
  ),
  (
    'Festival slot',
    'Outdoor stage — daytime set.',
    timestamptz '2025-07-05 14:00:00+01',
    'Victoria Park, London',
    1,
    null,
    null,
    null,
    'music',
    true
  ),
  (
    'Intimate duo show',
    'Seated, limited capacity.',
    timestamptz '2025-09-20 20:00:00+01',
    'Cafe Oto, Dalston, London',
    1,
    80,
    22,
    null,
    'music',
    true
  );

-- Optional: `image_url` must be a full https URL the browser can load (e.g. Supabase Storage public URL).
-- update public.events
-- set image_url = 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/YOUR_BUCKET/poster.jpg'
-- where name = 'Album launch — live set';

-- Optional: extra gallery rows for the event detail page (after you know the event UUID):
-- insert into public.event_gallery_images (event_id, image_url, sort_order)
-- values
--   ('00000000-0000-0000-0000-000000000000'::uuid, 'https://example.com/gig-1.jpg', 0);

-- Already inserted rows? Set placeholder price and (optional) backdate for archive gigs:
-- update public.events set price = 1 where category = 'music';
