const {APP,MOCK}=require('./_app');
// Uji interface module inti (Timer, Kategori, Hari) lewat window.StudyO, dengan jam palsu.
const {chromium}=require('playwright');const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
const T0=Date.parse('2026-11-16T03:00:00Z');          // Senin 10.00 WIB
(async()=>{const b=await chromium.launch();
async function fresh(extra){const c=await b.newContext();const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.clock.install({time:T0});
  const seed=JSON.stringify(Object.assign({v:2,set:{target:180,dayStart:4,maxH:3},cats:[
    {id:'mat',name:'Matematika',color:'#0071e3',type:'study',limit:60},{id:'git',name:'Git',color:'#ff9500',type:'study',limit:30},
    {id:'main',name:'Main',color:'#86868b',type:'rest',limit:30}],sel:'mat',sessions:[],active:null,sample:false},extra||{}));
  await c.addInitScript(s=>{if(!sessionStorage.__s){localStorage.setItem('study_break_v2',s);sessionStorage.__s='1';}},seed);
  await c.route(/cdn\.jsdelivr\.net/,r=>r.fulfill({contentType:'application/javascript',body:MOCK}));
  await p.goto(APP);await p.waitForFunction(()=>window.StudyO);
  // adapter Sync tiruan yang mencatat panggilan
  await p.evaluate(()=>{window.calls=[];StudyO.setSync({started:()=>calls.push('started'),ended:()=>calls.push('ended'),changed:()=>{}});});
  return p;}
const ev=(p,f)=>p.evaluate(f);
const S=p=>ev(p,()=>JSON.parse(localStorage.getItem('study_break_v2')));
const near=(a,b)=>Math.abs(a-b)<3000;   // jam palsu tetap berjalan pelan mengikuti waktu nyata

// 1. mulai, 25 menit, jeda
let p=await fresh();
await ev(p,()=>StudyO.Timer.toggle());ok((await ev(p,()=>StudyO.Timer.state())).running,'toggle memulai');
await p.clock.fastForward('25:00');await ev(p,()=>StudyO.Timer.toggle());
let s=await S(p);ok(s.sessions.length===1&&near(s.sessions[0].end-s.sessions[0].start,25*60e3)&&s.sessions[0].cat==='mat','jeda menyimpan satu sesi 25 menit');
ok((await ev(p,()=>StudyO.Timer.state())).paused&&near((await ev(p,()=>StudyO.Timer.state())).elapsed,25*60e3),'status dijeda, putaran 25 menit');
ok(JSON.stringify(await ev(p,()=>calls))==='["started","ended"]','adapter Sync: started lalu ended');
ok(/Matematika 25m tersimpan/.test(await p.textContent('#toast')),'toast dari pendengar Timer');
await ev(p,()=>StudyO.Timer.reset());ok((await ev(p,()=>StudyO.Timer.state())).elapsed===0,'reset ke 0');

// 2. sesi < 1 detik tidak disimpan
await ev(p,()=>StudyO.Timer.toggle());await p.clock.fastForward(500);await ev(p,()=>StudyO.Timer.toggle());
ok((await S(p)).sessions.length===1,'sesi di bawah 1 detik tidak disimpan');

// 3. ganti kategori saat berjalan (kelompok sama)
await ev(p,()=>{calls.length=0;StudyO.Timer.toggle();});await p.clock.fastForward('10:00');
await ev(p,()=>StudyO.Timer.switchTo('git'));s=await S(p);
ok(s.sessions.length===2&&s.sessions[1].cat==='mat'&&s.active&&s.active.cat==='git','switchTo saat berjalan: Matematika tersimpan, lanjut Git');
ok(JSON.stringify(await ev(p,()=>calls))==='["started","started"]','switchTo tidak memanggil ended (langsung mulai lagi)');

// 4. ganti ke kelompok lain: jeda, pindah ke Break, lalu mulai
await p.clock.fastForward('05:00');await ev(p,()=>StudyO.Timer.switchTo('main',{start:true}));
let st=await ev(p,()=>StudyO.Timer.state());s=await S(p);
ok(st.mode==='category'&&st.running&&s.active.cat==='main'&&s.sessions[2].cat==='git','switchTo ke istirahat: Git disimpan, mode Break, Main berjalan');
await ev(p,()=>StudyO.Timer.switchTo('main',{toggleSame:true}));ok(!(await ev(p,()=>StudyO.Timer.state())).running,'toggleSame menjeda kategori yang sama');

// 5. countdown 25 menit selesai tepat pada batas
p=await fresh();
await ev(p,()=>{StudyO.Timer.setMode('countdown');StudyO.Timer.setCountdown(25);StudyO.Timer.toggle();});
ok(!(await ev(p,()=>StudyO.Timer.setCountdown(10))),'durasi tidak bisa diubah saat berjalan');
await p.clock.fastForward('26:00');st=await ev(p,()=>StudyO.Timer.state());s=await S(p);
ok(st.finished&&!st.running&&s.sessions.length===1&&s.sessions[0].end-s.sessions[0].start===25*60e3,'Countdown selesai: sesi tepat 25 menit');
ok((await p.textContent('#status'))==='Waktu habis','status Waktu habis');

// 6. cut dan stoppedBy
p=await fresh();await ev(p,()=>StudyO.Timer.toggle());await p.clock.fastForward('04:00:00');
await ev(p,()=>StudyO.Timer.cut(Date.now()-60*60e3));s=await S(p);
ok(s.sessions.length===1&&near(s.sessions[0].end-s.sessions[0].start,3*3600e3)&&!s.active,'cut memotong sesi pada batas 3 jam');
await ev(p,()=>{calls.length=0;StudyO.Timer.toggle();});await p.clock.fastForward('20:00');
await ev(p,()=>StudyO.Timer.stoppedBy(Date.now()-5*60e3));s=await S(p);
ok(near(s.sessions[1].end-s.sessions[1].start,15*60e3)&&!s.active&&(await ev(p,()=>calls)).includes('ended'),'stoppedBy: sesi berakhir saat perangkat lain mulai');

// 7. Kategori termasuk yang dihapus
p=await fresh({gone:{py:{id:'py',name:'Python',color:'#5e5ce6',type:'study',limit:0}}});
ok((await ev(p,()=>StudyO.Kategori.find('py').name))==='Python'&&(await ev(p,()=>StudyO.Kategori.isGone('py'))),'Kategori.find menemukan kategori terhapus');
ok((await ev(p,()=>StudyO.Kategori.label(StudyO.Kategori.find('py'))))==='belajar · dihapus','label kategori terhapus');
ok((await ev(p,()=>[StudyO.Kategori.group({type:'rest'}),StudyO.Kategori.group({type:'ignore'})].join()))==='rest,work','kelompok: istirahat vs kerja');

// 8. Hari: sesi lintas pergantian hari (pukul 04.00 WIB) dipecah
const r=await ev(p,()=>{const a=Date.parse('2026-11-16T20:00:00Z'),z=Date.parse('2026-11-16T22:00:00Z');   // 03.00–05.00 WIB 17 Nov
  const d=StudyO.Hari.perDay([{cat:'py',start:a,end:z}]);return d;});
ok(r['2026-11-16'].py===3600e3&&r['2026-11-17'].py===3600e3,'perDay memecah sesi di jam pergantian hari');
ok((await ev(p,()=>StudyO.Hari.split({py:60e3,main:30e3}).study))===60e3,'split menghitung kategori terhapus sebagai belajar');
ok(!p.errs.length,'tanpa error JS');
await b.close();})();
