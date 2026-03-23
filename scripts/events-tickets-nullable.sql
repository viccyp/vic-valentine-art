-- Allow events without ticket inventory (e.g. TBA, external box office).
-- Run once in Supabase → SQL Editor.

alter table public.events
  alter column total_tickets drop not null,
  alter column available_tickets drop not null;
