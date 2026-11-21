-- Day End Report + CRM: cloud schema for Supabase.
-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Safe to run again (it only creates what is missing).

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My workspace',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- one row per saved item of the app (Day End Report, Won Deals, Contacts, Tasks)
create table if not exists public.kv (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  value text not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (workspace_id, key)
);

-- version goes up by one on every save; the app uses it to notice that another device saved first
create or replace function public.kv_bump() returns trigger language plpgsql as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists kv_bump on public.kv;
create trigger kv_bump before update on public.kv for each row execute function public.kv_bump();

-- membership check used by the access rules (security definer avoids rule recursion)
create or replace function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m where m.workspace_id = ws and m.user_id = auth.uid());
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.kv enable row level security;

drop policy if exists ws_select on public.workspaces;
create policy ws_select on public.workspaces for select to authenticated using (public.is_member(id));
drop policy if exists wm_select on public.workspace_members;
create policy wm_select on public.workspace_members for select to authenticated using (user_id = auth.uid());
drop policy if exists kv_select on public.kv;
create policy kv_select on public.kv for select to authenticated using (public.is_member(workspace_id));
drop policy if exists kv_insert on public.kv;
create policy kv_insert on public.kv for insert to authenticated with check (public.is_member(workspace_id));
drop policy if exists kv_update on public.kv;
create policy kv_update on public.kv for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
-- no delete rule on purpose: the app never deletes cloud rows, so nothing can wipe them by accident

-- returns the signed-in user's workspace, creating it the first time
create or replace function public.ensure_workspace() returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select workspace_id into ws from public.workspace_members where user_id = auth.uid() order by created_at limit 1;
  if ws is null then
    insert into public.workspaces (owner_id) values (auth.uid()) returning id into ws;
    insert into public.workspace_members (workspace_id, user_id, role) values (ws, auth.uid(), 'owner');
  end if;
  return ws;
end $$;

revoke all on public.workspaces, public.workspace_members, public.kv from anon;
grant select on public.workspaces, public.workspace_members to authenticated;
grant select, insert, update on public.kv to authenticated;
revoke all on function public.ensure_workspace() from public, anon;
grant execute on function public.ensure_workspace() to authenticated;
revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
