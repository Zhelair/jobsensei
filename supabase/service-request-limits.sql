-- Run once in Supabase SQL Editor before enabling feedback/research routes.
-- Stores abuse-prevention metadata only, never messages, emails or resumes.
begin;
create table if not exists public.service_requests (
  request_id uuid primary key,
  kind text not null check (kind in ('feedback', 'research')),
  user_id uuid references auth.users(id) on delete set null,
  ip_hash text not null,
  content_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists service_requests_created_idx on public.service_requests(kind, created_at);
alter table public.service_requests enable row level security;
revoke all on public.service_requests from anon, authenticated;
grant select, insert, update, delete on public.service_requests to service_role;

create or replace function public.reserve_service_request(
  p_request_id uuid, p_kind text, p_user_id uuid, p_ip_hash text, p_content_hash text
) returns text language plpgsql security definer set search_path = public as $$
declare previous public.service_requests%rowtype;
begin
  if p_kind not in ('feedback', 'research') then raise exception 'Invalid service'; end if;
  -- Serialize reservations across instances so caps cannot be raced.
  perform pg_advisory_xact_lock(754321, 1);
  -- Research metadata is retained for the monthly shared cap; no message content is stored.
  delete from public.service_requests where created_at < now() - interval '32 days';
  select * into previous from public.service_requests where request_id = p_request_id;
  if found then
    if previous.user_id is distinct from p_user_id or previous.kind <> p_kind or previous.content_hash <> p_content_hash then return 'conflict'; end if;
    return previous.status;
  end if;
  if p_kind = 'feedback' then
    if exists(select 1 from public.service_requests where kind=p_kind and user_id=p_user_id and content_hash=p_content_hash and status in ('pending','sent') and created_at > now()-interval '1 day') then return 'duplicate'; end if;
    if (select count(*) from public.service_requests where kind=p_kind and user_id=p_user_id and created_at>now()-interval '1 hour') >= 3
      or (select count(*) from public.service_requests where kind=p_kind and user_id=p_user_id and created_at>now()-interval '1 day') >= 10
      or (select count(*) from public.service_requests where kind=p_kind and ip_hash=p_ip_hash and created_at>now()-interval '1 hour') >= 10
      or (select count(*) from public.service_requests where kind=p_kind and created_at>now()-interval '1 day') >= 20
    then return 'limited'; end if;
  else
    if (select count(*) from public.service_requests where kind=p_kind and user_id=p_user_id and created_at>now()-interval '1 hour') >= 10
      or (select count(*) from public.service_requests where kind=p_kind and ip_hash=p_ip_hash and created_at>now()-interval '1 hour') >= 30
    then return 'limited'; end if;
    -- Shared basic-search budget; allow headroom below Tavily's 1,000 credits.
    if (select count(*) from public.service_requests where kind=p_kind and created_at >= date_trunc('month', now())) >= 800 then return 'budget'; end if;
  end if;
  insert into public.service_requests(request_id,kind,user_id,ip_hash,content_hash)
  values(p_request_id,p_kind,p_user_id,p_ip_hash,p_content_hash);
  return 'reserved';
end $$;
revoke all on function public.reserve_service_request(uuid,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.reserve_service_request(uuid,text,uuid,text,text) to service_role;
commit;
