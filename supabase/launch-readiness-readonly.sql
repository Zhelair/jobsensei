-- Read-only: no customer content, credentials, mutations or resets.
begin read only;
select expected.name,
       c.oid is not null as installed,
       coalesce(c.relrowsecurity,false) as rls_enabled
from (values ('accounts'),('device_registrations'),('hosted_credit_events'),
             ('billing_checkouts'),('billing_subscriptions'),('billing_events'),
             ('billing_refunded_transactions'),('secure_audit_events'),('service_requests')) expected(name)
left join pg_namespace n on n.nspname='public'
left join pg_class c on c.relnamespace=n.oid and c.relname=expected.name and c.relkind='r'
order by expected.name;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as server_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('apply_paddle_billing_event','apply_paddle_billing_event_base','apply_paddle_adjustment',
  'reserve_billing_checkout','consume_hosted_credits','refund_hosted_credits','reserve_service_request')
order by p.proname;

select extname, extversion from pg_extension where extname in ('pg_cron','pg_net');
commit;
