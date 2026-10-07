import dotenv from "dotenv";
import { Client } from "pg";
import { randomBytes, randomUUID, createCipheriv } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });
const save = process.argv.includes("--save");

let caCert = process.env.DATABASE_CA_CERT ? process.env.DATABASE_CA_CERT.replaceAll("\\n", "\n") : undefined;
if (!caCert && existsSync("supabase/certs/prod-ca-2021.crt")) {
  caCert = readFileSync("supabase/certs/prod-ca-2021.crt", "utf8");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true, ...(caCert ? { ca: caCert } : {}) },
  connectionTimeoutMillis: 10000
});
try {
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
  await client.connect();
  const check = await client.query("SELECT current_database() AS database, to_regclass('public.smtp_configuration') AS smtp_table, to_regclass('public.app_users') AS app_users");
  console.log(JSON.stringify(check.rows[0]));
  if (save) {
    const key = process.env.SMTP_CONFIG_ENCRYPTION_KEY || "";
    if (!/^[a-fA-F0-9]{64}$/.test(key)) throw new Error("Missing valid SMTP_CONFIG_ENCRYPTION_KEY");
    const config = { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD, fromEmail: process.env.SMTP_USER, fromName: "Tooldesk", enabled: false, sendHour: 9 };
    if (!config.host || !config.user || !config.password) throw new Error("Missing local SMTP configuration");
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", Buffer.from(key,"hex"),iv);
    cipher.setAAD(Buffer.from("tooldesk:smtp:v1"));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(config),"utf8"),cipher.final()]);
    const value = ["v1",iv.toString("base64"),cipher.getAuthTag().toString("base64"),encrypted.toString("base64")].join(".");
    await client.query("BEGIN");
    const existing = check.rows[0].smtp_table;
    if (!existing) {
      const migration = readFileSync("supabase/migrations/20261007_smtp_configuration.sql","utf8")
        .replace(/^BEGIN;\s*/m,"")
        .replace(/^COMMIT;\s*/m,"");
      await client.query(migration);
    }
    let actorId = randomUUID();
    if (check.rows[0].app_users) { const admin = await client.query("SELECT user_id FROM app_users WHERE active=true AND role='admin' LIMIT 1"); if (admin.rows[0]) actorId = admin.rows[0].user_id; }
    await client.query("INSERT INTO public.smtp_configuration(id,encrypted_config,updated_by,updated_at) VALUES ('default',$1,$2,NOW()) ON CONFLICT(id) DO UPDATE SET encrypted_config=EXCLUDED.encrypted_config,updated_by=EXCLUDED.updated_by,updated_at=NOW()",[value,actorId]);
    await client.query("COMMIT");
    const result = await client.query("SELECT id,updated_at FROM public.smtp_configuration WHERE id='default'");
    console.log(JSON.stringify({ saved: true, encrypted: true, enabled: false, record: result.rows[0] }));
  }
} catch (error) {
  try { await client.query("ROLLBACK"); } catch {}
  console.error(JSON.stringify({ error: error.code || "CONFIGURATION_ERROR", message: "SMTP database setup failed; no credentials displayed." }));
  process.exitCode = 1;
} finally { await client.end(); }
