begin;
alter function public.normalize_account_plan_state() set search_path = public, pg_temp;
-- The dashboard's automatic RLS event trigger is not a browser RPC.
-- Revoking browser execution does not change its owner or event-trigger behavior.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
commit;
