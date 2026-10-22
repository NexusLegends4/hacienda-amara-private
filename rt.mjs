import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter(l => /^\s*[A-Za-z0-9_]+\s*=/.test(l))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const c = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth:{persistSession:false,autoRefreshToken:false} });
let a;
for (let i = 0; i < 12; i++) { const r = await c.auth.signInAnonymously(); if (r.data?.user) { a = r.data; break; } await sleep(20000); }
if (!a) { console.log("no session"); process.exit(0); }
const uid = a.user.id;
await c.auth.setSession({ access_token: a.session.access_token, refresh_token: a.session.refresh_token });
let got = null;
const ch = c.channel("rt-single");
ch.on("postgres_changes", { event:"INSERT", schema:"public", table:"chat_messages" }, (p) => { got = p.new; });
await new Promise((res) => { ch.subscribe((s) => res()); setTimeout(res, 8000); });
const id = "staffsim-" + Date.now();
await c.from("chat_messages").insert({ id, conversation_key:uid, sender_id:uid, sender_role:"client", sender_name:"Hacienda Amara Assistant", content:"Staff-sim message", created_at:new Date().toISOString() }).select("*").single();
for (let i = 0; i < 12 && !got; i++) await sleep(500);
console.log(got ? "CLIENT RECEIVED staff-sim: " + got.sender_role + ": " + String(got.content).slice(0,40) : "CLIENT did NOT receive staff-sim insert");
await ch.unsubscribe();
await c.from("chat_messages").delete().eq("conversation_key", uid);
