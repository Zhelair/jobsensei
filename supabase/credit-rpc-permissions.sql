-- Incremental fix: credit mutation RPCs must be callable only by the server.
-- Does not change balances, function bodies, accounts or billing subscriptions.
begin;
revoke all on function public.consume_hosted_credits(uuid,text,text,text,text,integer)
  from public,anon,authenticated;
revoke all on function public.refund_hosted_credits(uuid,text,text,text,text,integer,text)
  from public,anon,authenticated;
grant execute on function public.consume_hosted_credits(uuid,text,text,text,text,integer)
  to service_role;
grant execute on function public.refund_hosted_credits(uuid,text,text,text,text,integer,text)
  to service_role;
commit;
