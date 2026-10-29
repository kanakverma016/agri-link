create table if not exists public.profiles (
  firebase_uid text primary key,
  email text,
  display_name text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
-- Server bridge uses Firebase Admin verification and the Supabase service role.
-- No client role is granted access to this table.
revoke all on public.profiles from anon, authenticated;

do $$ begin
  if not exists (select 1 from storage.buckets where id = 'user-files') then
    insert into storage.buckets (id, name, public) values ('user-files', 'user-files', true);
  end if;
end $$;
