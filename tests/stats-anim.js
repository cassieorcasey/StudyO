const {APP,shot}=require('./_app');
// Regresi: saat timer berjalan, render ulang berkala tidak boleh memutar ulang animasi masuk Statistik.
const {chromium}=require('playwright');const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(APP);await p.waitForTimeout(400);
await p.click('#mCd');await p.click('#toggle');await p.waitForTimeout(500);
await p.click('#tabSt');await p.waitForTimeout(7000);
const dim=await p.evaluate(()=>[...document.querySelectorAll('.tilecard,.heat i')].filter(e=>getComputedStyle(e).opacity<0.99).length);
ok(dim===0,'kartu & kalender tetap penuh setelah beberapa render ulang ('+dim+' pudar)');
ok(!errs.length,'tanpa error JS');await p.screenshot({path:shot('stats-anim.png')});await b.close()})();
