const {APP,MOCK,shot}=require('./_app');
const {chromium, devices}=require('playwright');
const fs=require('fs');
const db={settings:[],categories:[],sessions:[],active_timer:[]}; let clock=0; const pages=[];
const ts=()=>{ clock++; const d=new Date(Date.now()+clock); return d.toISOString().replace('Z','')+ '123+00:00'.slice(0,9).replace(/^/,'') ; };
const nowTs=()=>{ const d=new Date(); return d.toISOString().slice(0,23)+'456+00:00'; };
const key=(t,r)=> t==='settings'||t==='active_timer' ? r.user_id : r.user_id+'|'+r.id;
function handle(o){
  const rows=db[o.t]; let out=rows.filter(r=>r.user_id===o.uid);
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
  const A=await mk(b,{viewport:{width:1366,height:768},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130'},'A');
  ok((await A.textContent('#acct'))==='Masuk','A: tombol Masuk tampil');
  await A.click('#acct');
  await A.fill('#dlgBody input[type=password]','salah'); await A.fill('#dlgBody input[autocomplete=username]','me@test.id'); await A.click('text=Masuk dengan kata sandi'); await A.waitForTimeout(300);
  ok((await A.textContent('#dlgBody')).includes('kata sandi salah'),'A: kata sandi salah -> pesan jelas');
  ok(await A.isVisible('#dlgBody input[type=url]'),'A: kolom tempel tautan selalu terlihat');
  await A.fill('#dlgBody input[autocomplete=email]','me@test.id'); await A.click('text=Kirim tautan masuk'); await A.waitForTimeout(200);
  await A.fill('#dlgBody input[type=url]','https://www.google.com/url?q='+encodeURIComponent('https://mzeovinagkjvoocbeytj.supabase.co/auth/v1/verify?token=bad&type=magiclink&redirect_to=http://localhost:3000'));
  await A.click('#dlgBody button:text-is("Masuk")'); await A.waitForTimeout(300);
  ok((await A.textContent('#dlgBody')).includes('kedaluwarsa'),'A: token buruk -> pesan kedaluwarsa');
  await A.fill('#dlgBody input[type=url]','https://mzeovinagkjvoocbeytj.supabase.co/auth/v1/verify?token=good&type=magiclink&redirect_to=http://localhost:3000');
  await A.click('#dlgBody button:text-is("Masuk")'); await A.waitForTimeout(2500);
  ok(db.categories.length===4 && db.settings.length===1,'A: kategori & pengaturan terkirim ('+db.categories.length+')');
  ok((await A.textContent('#acct'))==='Tersinkron','A: status Tersinkron');
  await A.keyboard.press('Escape');
  await A.click('#toggle'); await A.waitForTimeout(600);
  ok(db.active_timer.length===1 && db.active_timer[0].device.startsWith('Windows'),'A: timer aktif tercatat di server');
  await A.waitForTimeout(1200); await A.click('#toggle'); await A.waitForTimeout(2200);
  ok(db.sessions.length===1 && db.active_timer.length===0,'A: sesi terkirim, timer aktif dihapus');
  // rename Python -> Aljabar
  await A.click('#tabKat'); const nm=A.locator('#cats input[type=text]').nth(1); await nm.fill('Aljabar'); await A.waitForTimeout(2500);
  console.log('DBG acct', await A.textContent('#acct'), await A.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('study_break_v2')).sync.h.c))); console.log('DBG local', await A.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('study_break_v2')).cats.map(c=>c.name))), 'server', JSON.stringify(db.categories.map(c=>c.name)), 'inputs', await A.locator('#cats input[type=text]').evaluateAll(e=>e.map(x=>x.value)));
  await A.click('#tabTimer'); ok(db.categories.find(c=>c.id==='py').name==='Aljabar','A: ganti nama kategori tersinkron');

  const B=await mk(b,devices['iPhone 13'],'B');
  await B.click('#acct'); await B.fill('#dlgBody input[autocomplete=username]','me@test.id'); await B.fill('#dlgBody input[type=password]','rahasia123'); await B.click('text=Masuk dengan kata sandi'); await B.waitForTimeout(2500);
  await B.keyboard.press('Escape');
  ok((await B.textContent('#chips')).includes('Aljabar'),'B: sinkron pertama, nama dari server menang');
  const bS=await B.evaluate(()=>JSON.parse(localStorage.getItem('study_break_v2')).sessions.length);
  ok(bS===1,'B: sesi dari A ikut tertarik');
  ok(db.categories.length===4,'B: tidak membuat kategori ganda');

  // takeover
  await A.click('#toggle'); await A.waitForTimeout(1500);
  await B.click('#toggle'); await B.waitForTimeout(500);
  ok(await B.isVisible('#other'),'B: tawaran ambil alih muncul: '+(await B.textContent('#otherText')));
  await B.click('#otherTake'); await B.waitForTimeout(1500);
  ok(db.active_timer.length===1 && db.active_timer[0].device.startsWith('iPhone'),'B: timer aktif kini milik iPhone');
  ok(!(await A.evaluate(()=>!!JSON.parse(localStorage.getItem('study_break_v2')).active)),'A: timer berhenti otomatis lewat realtime');
  ok((await A.textContent('#notice')).includes('diambil alih'),'A: pemberitahuan: '+(await A.textContent('#notice')));
  ok((await A.textContent('#status')).includes('Berjalan di iPhone'),'A: status menunjukkan timer di iPhone');
  await B.waitForTimeout(1000); await B.click('#toggle'); await B.waitForTimeout(2500); await A.evaluate(()=>{}); 
  await A.waitForTimeout(500);
  ok(db.sessions.filter(s=>!s.deleted).length===3,'Server: 3 sesi ('+db.sessions.length+')');
  // overlap check
  const sv=db.sessions.map(s=>[Date.parse(s.started_at.replace(/(\.\d{3})\d+/,'$1')),Date.parse(s.ended_at.replace(/(\.\d{3})\d+/,'$1'))]).sort((a,b)=>a[0]-b[0]);
  ok(sv.every((s,i)=>i===0||s[0]>=sv[i-1][1]),'Server: sesi A dan B tidak tumpang tindih');
  // delete on B
  await B.click('#tabSt'); await B.uncheck('#useSample'); await B.waitForTimeout(300);
  ok((await B.locator('.hrow').count())===3,'B: riwayat 3 sesi');
  await B.locator('.hrow .x').first().click(); await B.waitForTimeout(2500);
  ok(db.sessions.filter(s=>s.deleted).length===1,'Server: sesi ditandai terhapus');
  await A.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await A.waitForTimeout(2500);
  ok((await A.evaluate(()=>JSON.parse(localStorage.getItem('study_break_v2')).sessions.length))===2,'A: penghapusan dari B ikut terhapus');
  // conflict marking
  { const n=Date.now(), I=x=>new Date(x).toISOString().replace('Z','123+00:00'), u=new Date().toISOString().replace('Z','999+00:00');
    db.sessions.push({user_id:'u1',id:'x1',cat_id:'mat',started_at:I(n-3600e3),ended_at:I(n-1800e3),device:'Windows-a',deleted:false,updated_at:u},{user_id:'u1',id:'x2',cat_id:'py',started_at:I(n-2700e3),ended_at:I(n-900e3),device:'iPhone-b',deleted:false,updated_at:u}); }
  await A.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await A.waitForTimeout(1500); await A.click('#tabSt'); await A.uncheck('#useSample'); await A.waitForTimeout(400);
  ok(await A.isVisible('#confNote'),'A: peringatan tumpang tindih: '+(await A.textContent('#confNote')).slice(0,40));
  ok((await A.locator('.hrow.conf').count())===2,'A: 2 baris bertanda oranye');
  await A.screenshot({path:shot('sync-stats.png'),fullPage:true});
  await A.click('#acct'); await A.waitForTimeout(300); await A.screenshot({path:shot('sync-dlg.png')});
  await B.click('#tabTimer'); await B.click('#acct'); await B.waitForTimeout(300); await B.screenshot({path:shot('sync-dlg-phone.png')});
  // offline: lib missing
  const c=await b.newContext({viewport:{width:1366,height:768}}); await c.route(/cdn\.jsdelivr\.net/,r=>r.abort());
  const C=await c.newPage(); const errs=[]; C.on('pageerror',e=>errs.push(e.message)); await C.goto(APP); await C.waitForTimeout(300);
  await C.click('#toggle'); await C.waitForTimeout(1200); await C.click('#toggle');
  ok((await C.textContent('#acct'))==='Offline' && errs.length===0 && (await C.evaluate(()=>JSON.parse(localStorage.getItem('study_break_v2')).sessions.length))===1,'Tanpa pustaka: timer tetap jalan, status Offline, tanpa error');
  await b.close();
})();
