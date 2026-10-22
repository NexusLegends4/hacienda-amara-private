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
const uid = a.user.id, tok = a.session.access_token;
await c.auth.setSession({ access_token: tok, refresh_token: a.session.refresh_token });
let got = null;
const ch = c.channel("rt-test-3");
ch.on("postgres_changes", { event:"INSERT", schema:"public", table:"chat_messages" }, (p) => { got = p.new; });
await new Promise((res) => { ch.subscribe((s) => res()); setTimeout(res, 8000); });
console.log("subscribed as client:", uid);
// Insert a BOT reply as the client (trigger allows bot when conversation_key=uid)
const id = "bot-" + Date.now();
const r = await fetch("http://localhost:5173/api/chat-message", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${tok}` }, body: JSON.stringify({ message:{ id, conversation_key:uid, sender_id:"bot", sender_role:"bot", sender_name:"Hacienda Amara Assistant", content:"Bot reply test message", created_at:new Date().toISOString() } }) });
console.log("bot insert status:", r.status, r.status !== 201 ? await r.text() : "");
for (let i = 0; i < 12 && !got; i++) await sleep(500);
console.log(got ? "CLIENT GOT bot msg: " + got.sender_role + ": " + String(got.content).slice(0,30) : "CLIENT DID NOT RECEIVE");
await ch.unsubscribe();
await c.from("chat_messages").delete().eq("conversation_key", uid);
