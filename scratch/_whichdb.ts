import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
for (const line of readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const t=line.trim(); if(!t||t.startsWith("#"))continue; const i=t.indexOf("="); if(i<=0)continue;
  process.env[t.slice(0,i).trim()]=t.slice(i+1).trim().replace(/^["']|["']$/g,"");
}
const pool=new Pool({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME||"postgres",port:Number.parseInt(process.env.DB_PORT||"5432"),ssl:{rejectUnauthorized:false},connectionTimeoutMillis:8000});
async function safe(l,s){try{const r=await pool.query(s);console.log("\n=== "+l+" ===");console.log(JSON.stringify(r.rows,null,2));}catch(e){console.log("\n=== "+l+" === [ERR] "+e.message);}}
async function main(){
  console.log("Connected host(from env):", process.env.DB_HOST, "db(from env):", process.env.DB_NAME);
  await safe("identity", `SELECT current_database() AS db, current_user AS usr, inet_server_addr()::text AS server_ip, inet_server_port() AS port`);
  await safe("databases on this server", `SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY 1`);
  // team's NEW artifacts:
  await safe("question_templates has template_uuid? (team's new design)", `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='question_templates' AND column_name IN ('template_uuid','status','interaction_type') ORDER BY 1`);
  await safe("questions has template_id? (migration 0017)", `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='questions' AND column_name='template_id'`);
  await safe("enum_question_type has interactive? (migration 0016)", `SELECT 1 AS present FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='enum_question_type' AND e.enumlabel='interactive'`);
  // migration tracking tables
  await safe("migration tracking tables", `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%migration%' OR table_name='SequelizeMeta') ORDER BY 1`);
  // any 'questions' table in ANY schema that has template_id?
  await safe("ANY schema: questions.template_id present?", `SELECT table_schema FROM information_schema.columns WHERE table_name='questions' AND column_name='template_id'`);
  await pool.end();
}
main().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
