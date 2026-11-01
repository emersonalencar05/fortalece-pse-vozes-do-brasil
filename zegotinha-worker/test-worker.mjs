import assert from 'node:assert/strict';
import app from './worker.js';
const origin='https://emersonalencar05.github.io';
const env={OPENAI_API_KEY:'test-key',ALLOWED_ORIGINS:origin,OPENAI_MODEL:'gpt-4.1-mini',VISITOR_LIMITER:{limit:async()=>({success:true})},GLOBAL_LIMITER:{limit:async()=>({success:true})}};
function req(path,body,org=origin){return new Request('https://fake.workers.dev'+path,{method:body?'POST':'GET',headers:{...(org?{Origin:org}:{}),...(body?{'Content-Type':'application/json','X-Visitor-ID':'1234567890'}:{})},body:body?JSON.stringify(body):undefined})}
let r=await app.fetch(req('/health'),env);assert.equal(r.status,200);assert.equal((await r.json()).aiReady,true);
r=await app.fetch(req('/chat',{mode:'livre',messages:[{role:'user',content:'oi'}]},'https://evil.example'),env);assert.equal(r.status,403);
r=await app.fetch(req('/chat',{mode:'livre',messages:[{role:'user',content:'meu CPF é 123.456.789-10'}]}),env);assert.equal(r.status,400);
r=await app.fetch(req('/chat',{mode:'fortalece',messages:[{role:'user',content:'Quais os horários da programação detalhada?'}]}),env);assert.equal(r.status,200);assert.match((await r.json()).reply,/não tenho essa informação confirmada/);
const old=globalThis.fetch;let called;
globalThis.fetch=async(_,opts)=>{called=JSON.parse(opts.body);return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'Bora! Eu sou uma IA educativa. 💙'}]}]}),{status:200,headers:{'Content-Type':'application/json'}})};
r=await app.fetch(req('/chat',{mode:'curiosidade',messages:[{role:'user',content:'me conte uma curiosidade'}]}),env);
assert.equal(r.status,200);assert.equal((await r.json()).reply,'Bora! Eu sou uma IA educativa. 💙');
assert.equal(called.store,false);assert.match(called.instructions,/NUNCA invente dados/);assert.equal(called.input.length,1);assert.equal(called.max_output_tokens,360);
globalThis.fetch=old;
console.log('Worker: health, CORS, PII, fatos confirmados, prompt e OpenAI simulada OK');
