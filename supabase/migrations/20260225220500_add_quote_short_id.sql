-- Add short_id column to quotes
alter table public.quotes
add column short_id text unique;

-- Backfill existing quotes with a random ID (simplistic approach for migration)
update public.quotes
set short_id = substring(md5(random()::text) from 1 for 8)
where short_id is null;

-- Make it required for future rows
alter table public.quotes
alter column short_id set not null;
