const {APP}=require('./_app');
// Regresi: di Safari iPhone tombol tidak mendapat fokus saat diketuk. Dulu ketukan ✕ pertama mengganti isi seluruh halaman.
const {chromium,devices}=require('playwright');const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13']});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const H=3600e3,now=Date.now();
 const seed=JSON.stringify({v:2,set:{target:180,dayStart:4,maxH:3},cats:[{id:'mat',name:'Matematika',color:'#0071e3',type:'study',limit:60},{id:'git',name:'Git',color:'#5e5ce6',type:'study',limit:60},{id:'main',name:'Main',color:'#86868b',type:'rest',limit:30}],sel:'mat',sessions:[{id:'s1',cat:'git',start:now-2*H,end:now-1*H}],active:null,sample:false});
 await c.addInitScript(s=>{if(!sessionStorage.__seeded){localStorage.setItem('study_break_v2',s);sessionStorage.__seeded='1';}},seed);
 await p.goto(APP);await p.waitForTimeout(300);await p.click('#tabKat');await p.waitForTimeout(300);
 const tap=()=>p.evaluate(()=>{document.activeElement&&document.activeElement.blur();document.querySelectorAll('#cats button[title="Hapus kategori"]')[1].click();});
 await tap();await p.waitForTimeout(200);
 const st=await p.evaluate(()=>({kids:document.body.children.length,lbl:document.querySelectorAll('#cats button[title="Hapus kategori"]')[1].textContent}));
 ok(st.kids>3&&st.lbl==='Yakin?','ketukan pertama hanya mengubah tombol jadi "Yakin?"');
 await tap();await p.waitForTimeout(300);
 const names=await p.evaluate(()=>[...document.querySelectorAll('#cats input[type=text]')].map(x=>x.value));
 ok(JSON.stringify(names)==='["Matematika","Main"]','ketukan kedua menghapus Git');ok(!errs.length,'tanpa error JS');await b.close();})();
