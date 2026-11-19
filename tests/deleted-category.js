const {TIMER:APP,MOCK,shot}=require('./_app');
const {chromium, devices}=require('playwright');
const fs=require('fs');
const db={settings:[],categories:[],sessions:[],active_timer:[]}; let clock=0; const pages=[];
const ts=()=>{ clock++; const d=new Date(Date.now()+clock); return d.toISOString().replace('Z','')+ '123+00:00'.slice(0,9).replace(/^/,'') ; };
const nowTs=()=>{ const d=new Date(); return d.toISOString().slice(0,23)+'456+00:00'; };
const key=(t,r)=> t==='settings'||t==='active_timer' ? r.user_id : r.user_id+'|'+r.id;
function handle(o){
  const rows=db[o.t]; if(!rows) return {data:null,error:{code:'PGRST205',message:"Could not find the table 'public."+o.t+"' in the schema cache"}}; let out=rows.filter(r=>r.user_id===o.uid);
  const flt=(list)=>list.filter(r=>o.f.every(([op,c,v])=> op==='eq'?r[c]===v : op==='in'?v.includes(r[c]) : op==='gte'? Date.parse(r[c].replace(/(\.\d{3})\d+/,'$1'))>=Date.parse(v) : true));
  if(o.op==='select'){ out=flt(out); return {data:o.single?(out[0]||null):out,error:null}; }
  if(o.op==='upsert'){ for(const r of o.rows){ if(r.user_id!==o.uid) return {data:null,error:{message:'RLS violation'}};
      const i=rows.findIndex(x=>key(o.t,x)===key(o.t,r)); const n=Object.assign({},i>=0?rows[i]:{},r,{updated_at:nowTs()}); if(i>=0) rows[i]=n; else rows.push(n); }
    if(o.t==='active_timer') rt(); return {data:null,error:null}; }
  if(o.op==='update'){ flt(out).forEach(r=>Object.assign(r,o.vals,{updated_at:nowTs()})); return {data:null,error:null}; }
  if(o.op==='delete'){ const del=flt(out); db[o.t]=rows.filter(r=>!del.includes(r)); if(o.t==='active_timer') rt(); return {data:null,error:null}; }
}
function rt(){ setTimeout(()=>pages.forEach(p=>p.evaluate(()=>window.__rt&&window.__rt()).catch(()=>{})),50); }
const mock=MOCK;
async function mk(b,dev,name){ const c=await b.newContext({...dev}); await c.exposeFunction('mockDb',s=>JSON.stringify(handle(JSON.parse(s))));
  await c.route(/cdn\.jsdelivr\.net/, r=>r.fulfill({contentType:'application/javascript',body:mock}));
  const p=await c.newPage(); p.on('pageerror',e=>console.log(name,'PAGEERROR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log(name,'console',m.text()); });
  await p.goto(APP); pages.push(p); return p; }
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
  const b=await chromium.launch();
  // State awal A: 2 jam Python (belajar) hari ini + 1 jam kemarin, data contoh mati
  const now=Date.now(), H=3600e3;
  const st={v:2,set:{target:180,dayStart:4,maxH:3},cats:[
    {id:'mat',name:'Matematika',color:'#0071e3',type:'study',limit:60},{id:'git',name:'Git',color:'#5e5ce6',type:'study',limit:60},
    {id:'main',name:'Main',color:'#86868b',type:'rest',limit:30},{id:'rest',name:'Istirahat',color:'#c7c7cc',type:'rest',limit:5,cd:true}],
    sel:'mat',sessions:[{id:'s1',cat:'git',start:now-2.5*H,end:now-0.5*H},{id:'s0',cat:'git',start:now-25*H,end:now-24*H}],active:null,sample:false};
  const A=await mk(b,{viewport:{width:1366,height:768}},'A');
  await A.evaluate(s=>{localStorage.setItem('study_break_v2',s);Storage.prototype.setItem=()=>{};},JSON.stringify(st)); await A.reload(); await A.waitForTimeout(400);
  const rowsBefore=await A.textContent('#rows');
  await A.click('#acct'); await A.fill('#dlgBody input[autocomplete=username]','me@test.id'); await A.fill('#dlgBody input[type=password]','rahasia123'); await A.click('text=Masuk dengan kata sandi'); await A.waitForTimeout(2500); await A.keyboard.press('Escape');
  ok((await A.textContent('#acct'))==='Tersinkron','Tabel notes belum ada di server: sinkron sesi dan kategori tetap berhasil');
  // hapus Git
  await A.click('#tabKat'); const del=A.locator('#cats button[title="Hapus kategori"]').nth(1); await del.click(); await del.click(); await A.waitForTimeout(2500);
  ok(!(await A.locator('#cats input[type=text]').evaluateAll(e=>e.map(x=>x.value))).includes('Git'),'A: Git terhapus dari daftar kategori');
  ok(db.categories.find(c=>c.id==='git').deleted===true,'A: penghapusan terkirim ke server');
  await A.click('#tabTimer'); await A.waitForTimeout(300);
  const rows=await A.textContent('#rows'); ok(/Git.*dihapus.*2j/.test(rows),'A: Hari ini masih menampilkan Git 2j (dihapus): '+rows.replace(/\s+/g,' ').slice(0,160));
  await A.click('#tabSt'); await A.waitForTimeout(800);
  const stA=await A.textContent('#viewStats'); ok(stA.includes('Git (dihapus)'),'A: Per topik menampilkan Git (dihapus)');
  ok(/3j/.test(await A.textContent('#topics')),'A: total Git 3j tetap dihitung minggu ini');
  ok(stA.includes('Hari aktif')&&!/Hari aktif\s*0/.test(stA),'A: hari aktif tidak nol');
  const histSel=await A.locator('#hist select').first().evaluate(s=>s.options[s.selectedIndex].textContent); ok(histSel==='Git (dihapus)','A: riwayat menampilkan "Git (dihapus)"');
  // Perangkat B tarik dari server
  const B=await mk(b,devices['iPhone 13'],'B');
  await B.click('#acct'); await B.fill('#dlgBody input[autocomplete=username]','me@test.id'); await B.fill('#dlgBody input[type=password]','rahasia123'); await B.click('text=Masuk dengan kata sandi'); await B.waitForTimeout(2500); await B.keyboard.press('Escape');
  console.log('DBG B', await B.evaluate(()=>{const s=JSON.parse(localStorage.getItem('study_break_v2'));return JSON.stringify({g:s.gone,n:s.sessions.length,sample:s.sample})}));
  await B.click('#tabSt'); await B.waitForTimeout(500); await B.uncheck('#useSample'); await B.waitForTimeout(500);
  ok((await B.textContent('#topics')).includes('Git (dihapus)'),'B: Git (dihapus) juga dihitung di perangkat lain');
  ok(!(await B.textContent('#chips').catch(()=>'')).includes('Git'),'B: Git tidak muncul di chip timer');
  await b.close();
})();
