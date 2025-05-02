create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text check (event_type in ('upload', 'search', 'delete')),
  event_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);