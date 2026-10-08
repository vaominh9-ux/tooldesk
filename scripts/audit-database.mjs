import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

// Every inspection runs in a read-only transaction. Never print credentials,
// personal records, cron commands or provider errors containing request URLs.
const output = process.argv[2] || 'scratch/system-audit/database.json';
const report = { checkedAt: new Date().toISOString(), target: 'DATABASE_URL configured in this workspace', readOnly: true, sections: {} };
let pool, client;
try {
 if (!process.env.DATABASE_URL) throw Object.assign(new Error(), { code: 'MISSING_DATABASE_URL' });
 const url = new URL(process.env.DATABASE_URL);
 if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '5432') url.port = '6543';
 const ca = process.env.DATABASE_CA_CERT?.replaceAll('\\n','\n') || readFileSync('supabase/certs/prod-ca-2021.crt','utf8');
 pool = new Pool({ connectionString:url.href, max:1, connectionTimeoutMillis:10000, ssl:process.env.DATABASE_SSL==='disable'?false:{rejectUnauthorized:true,ca} });
 client=await pool.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='3s'");
 async function inspect(name,sql) { report.sections[name]=(await client.query(sql)).rows; }
 await inspect('tables',"SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
 const names=new Set(report.sections.tables.map(row=>row.table_name));
 const required=['settings','products','product_plans','customers','subscriptions','orders','refunds','campaigns','activity_logs','care_appointments','reminder_runs','email_outbox','smtp_configuration','zalo_bot_settings','zalo_notification_jobs','zalo_notification_runs','command_idempotency','app_users'];
 report.missingTables=required.filter(name=>!names.has(name));
 if (!report.missingTables.length) {
  await inspect('counts',`SELECT (SELECT COUNT(*) FROM customers) AS customers,(SELECT COUNT(*) FROM orders) AS orders,(SELECT COUNT(*) FROM subscriptions) AS subscriptions,(SELECT COUNT(*) FROM refunds) AS refunds,(SELECT COUNT(*) FROM care_appointments WHERE status='scheduled' AND scheduled_at<=NOW()) AS care_due`);
  await inspect('dataIntegrity',`SELECT
   (SELECT COUNT(*) FROM orders WHERE price<0 OR cost<0 OR price>9007199254740991 OR cost>9007199254740991 OR expires_at<=starts_at OR payment NOT IN ('paid','unpaid') OR status NOT IN ('completed','cancelled')) AS invalid_orders,
   (SELECT COUNT(*) FROM subscriptions WHERE price<0 OR cost<0 OR expires_at<=starts_at) AS invalid_subscriptions,
   (SELECT COUNT(*) FROM product_plans WHERE price<0 OR cost<0 OR duration<=0 OR unit NOT IN ('days','months')) AS invalid_plans,
   (SELECT COUNT(*) FROM customers WHERE email_consent NOT IN ('unknown','opted_in','opted_out')) AS invalid_consent,
   (SELECT COUNT(*) FROM orders o JOIN product_plans p ON p.id=o.plan_id WHERE p.product_id<>o.product_id) AS order_plan_mismatch,
   (SELECT COUNT(*) FROM subscriptions s JOIN product_plans p ON p.id=s.plan_id WHERE p.product_id<>s.product_id) AS subscription_plan_mismatch,
   (SELECT COUNT(*) FROM orders o JOIN subscriptions s ON s.id=o.subscription_id WHERE o.customer_id<>s.customer_id OR o.product_id<>s.product_id) AS order_subscription_mismatch,
   (SELECT COUNT(*) FROM subscriptions s LEFT JOIN orders o ON o.id=s.last_order_id WHERE s.last_order_id IS NOT NULL AND (o.id IS NULL OR o.subscription_id<>s.id)) AS invalid_last_order,
   (SELECT COUNT(*) FROM (SELECT lower(trim(email)) FROM customers WHERE trim(COALESCE(email,''))<>'' GROUP BY lower(trim(email)) HAVING COUNT(*)>1) duplicates) AS duplicate_email_groups,
   (SELECT COUNT(*) FROM orders WHERE payment='paid' AND paid_at IS NULL) AS paid_dates_missing,
   (SELECT COUNT(*) FROM orders WHERE payment='unpaid' AND paid_at IS NOT NULL) AS unpaid_with_paid_date,
   (SELECT COUNT(*) FROM orders WHERE paid_at<date) AS payment_before_order`);
  await inspect('ledgerIntegrity',`WITH ledger AS (SELECT order_id,SUM(amount)::numeric AS refunded,SUM(cost_recovered)::numeric AS recovered FROM refunds GROUP BY order_id)
   SELECT COUNT(*) FILTER (WHERE l.refunded>CASE WHEN o.payment='paid' AND o.status<>'cancelled' THEN o.price ELSE 0 END) AS over_refunds,
   COUNT(*) FILTER (WHERE l.recovered>CASE WHEN o.payment='paid' AND o.status<>'cancelled' THEN o.cost ELSE 0 END) AS over_recoveries
   FROM ledger l JOIN orders o ON o.id=l.order_id`);
  await inspect('refundIntegrity',`SELECT COUNT(*) FILTER(WHERE r.amount<0 OR r.cost_recovered<0 OR r.amount=0 AND r.cost_recovered=0) AS invalid_amounts,
   COUNT(*) FILTER(WHERE r.date<COALESCE(o.paid_at,o.date)) AS before_payment,
   COUNT(*) FILTER(WHERE r.date>(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS future_entries FROM refunds r JOIN orders o ON o.id=r.order_id`);
  // Compare the application's actual calculation with independent PostgreSQL
  // numeric sums. Raw order IDs and amounts are kept in memory, never printed.
  const module={exports:{}};
  const compiled=ts.transpileModule(readFileSync('src/domain/money.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  runInNewContext(compiled,{module,exports:module.exports});
  const orders=(await client.query(`SELECT id,price::text,cost::text,payment,status,date::text,paid_at::text AS "paidAt",product_id AS "productId",kind FROM orders`)).rows.map(row=>({...row,price:Number(row.price),cost:Number(row.cost)}));
  const refunds=(await client.query(`SELECT order_id AS "orderId",amount::text,cost_recovered::text AS "costRecovered",date::text FROM refunds`)).rows.map(row=>({...row,amount:Number(row.amount),costRecovered:Number(row.costRecovered)}));
  const months=[...new Set([...orders.flatMap(row=>[row.date.slice(0,7),...(row.paidAt?[row.paidAt.slice(0,7)]:[])]),...refunds.map(row=>row.date.slice(0,7))])].sort();
  report.sections.financialReconciliation=[];
  for(const month of months){
   const exact=(await client.query(`WITH paid AS (SELECT COALESCE(SUM(price),0)::numeric AS received,COALESCE(SUM(cost),0)::numeric AS cost FROM orders WHERE payment='paid' AND status<>'cancelled' AND TO_CHAR(COALESCE(paid_at,date),'YYYY-MM')=$1), returned AS (SELECT COALESCE(SUM(r.amount),0)::numeric AS refunded,COALESCE(SUM(r.cost_recovered),0)::numeric AS recovered FROM refunds r JOIN orders o ON o.id=r.order_id WHERE TO_CHAR(r.date,'YYYY-MM')=$1) SELECT received::text,cost::text,refunded::text,recovered::text AS "costRecovered",(received-refunded)::text AS revenue,(received-refunded-cost+recovered)::text AS gross FROM paid,returned`,[month])).rows[0];
   const calculated=module.exports.calculateTotals({orders,refunds},month);
   const mismatches=Object.entries(exact).filter(([key,value])=>!Number.isSafeInteger(calculated[key])||String(calculated[key])!==value).map(([key])=>key);
   report.sections.financialReconciliation.push({month,totals:exact,mismatches,matched:mismatches.length===0});
  }
  await inspect('zaloConfiguration',"SELECT enabled,expiring,expired,care,send_hour,chat_id IS NOT NULL AS linked,pairing_hash IS NOT NULL AND pairing_expires_at>NOW() AS pairing_pending FROM zalo_bot_settings WHERE id='default'");
  await inspect('zaloJobs',"SELECT status,COUNT(*) AS count FROM zalo_notification_jobs GROUP BY status");
  await inspect('zaloRuns',"SELECT started_at,finished_at,status,sent_count,failed_count,unknown_count FROM zalo_notification_runs ORDER BY started_at DESC LIMIT 5");
  await inspect('emailJobs',"SELECT status,COUNT(*) AS count FROM email_outbox GROUP BY status");
  await inspect('emailRuns',"SELECT started_at,finished_at,status,sent_count,failed_count,unknown_count FROM reminder_runs ORDER BY started_at DESC LIMIT 5");
  await inspect('smtpRecord',"SELECT COUNT(*) AS configured_rows FROM smtp_configuration");
 }
 await inspect('constraints',"SELECT conrelid::regclass::text AS table_name,conname,convalidated FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='c' ORDER BY 1,2");
 await inspect('rls',"SELECT c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') AS anon_select,has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_select FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname");
 await inspect('policies',"SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname");
 await inspect('foreignKeys',"SELECT conrelid::regclass::text AS table_name,conname,convalidated,confdeltype AS delete_action FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f' ORDER BY 1,2");
 await inspect('indexes',"SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexdef LIKE 'CREATE UNIQUE%' ORDER BY 1,2");
 await inspect('timestampDefaults',"SELECT table_name,column_name,column_default FROM information_schema.columns WHERE table_schema='public' AND data_type='timestamp with time zone' AND column_default IS NOT NULL ORDER BY 1,2");
 await inspect('schedulerExtension',"SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net')");
 if ((await client.query("SELECT to_regclass('cron.job') AS table_name")).rows[0].table_name) {
  await inspect('schedulerJobs',"SELECT jobid,schedule,active,CASE WHEN strpos(command,'zalo-notifications')>0 THEN 'zalo' ELSE 'email' END AS channel FROM cron.job WHERE strpos(command,'/api/cron/')>0");
  if ((await client.query("SELECT to_regclass('cron.job_run_details') AS table_name")).rows[0].table_name) await inspect('schedulerRuns',"SELECT r.jobid,r.status,r.start_time,r.end_time FROM cron.job_run_details r JOIN cron.job j ON j.jobid=r.jobid WHERE strpos(j.command,'/api/cron/')>0 ORDER BY r.start_time DESC LIMIT 10");
 }
 await client.query('ROLLBACK');
 report.completed=true;
} catch(error) {
 report.completed=false;report.errorCode=error&&typeof error==='object'&&'code' in error?String(error.code):'AUDIT_UNAVAILABLE';
} finally {client?.release();await pool?.end();}
mkdirSync('scratch/system-audit',{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.completed)process.exitCode=1;
