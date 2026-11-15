(function(){
  const call = (o) => window.mockDb(JSON.stringify(o)).then(r => JSON.parse(r));
  function Q(table){ this.t=table; this.op='select'; this.f=[]; this.single=false; }
  Q.prototype.select=function(){ return this; };
  Q.prototype.gte=function(c,v){ this.f.push(['gte',c,v]); return this; };
  Q.prototype.eq=function(c,v){ this.f.push(['eq',c,v]); return this; };
  Q.prototype.in=function(c,v){ this.f.push(['in',c,v]); return this; };
  Q.prototype.maybeSingle=function(){ this.single=true; return this; };
  Q.prototype.upsert=function(rows,o){ this.op='upsert'; this.rows=Array.isArray(rows)?rows:[rows]; this.on=(o||{}).onConflict; return this; };
  Q.prototype.update=function(v){ this.op='update'; this.vals=v; return this; };
  Q.prototype.delete=function(){ this.op='delete'; return this; };
  Q.prototype.then=function(res,rej){ const uid=(JSON.parse(localStorage.getItem('mock_session')||'null')||{}).user?.id;
    return call({t:this.t,op:this.op,f:this.f,single:this.single,rows:this.rows,vals:this.vals,uid}).then(res,rej); };
  window.supabase={ createClient(){ let cbs=[]; const ses=()=>JSON.parse(localStorage.getItem('mock_session')||'null');
    const login=()=>{ const s={access_token:'a',user:{id:'u1',email:'me@test.id'}}; localStorage.setItem('mock_session',JSON.stringify(s)); setTimeout(()=>cbs.forEach(cb=>cb('SIGNED_IN',s)),0); return {data:{session:s},error:null}; };
    const auth={ onAuthStateChange(cb){ cbs.push(cb); setTimeout(()=>cb('INITIAL_SESSION',ses()),0); return {data:{subscription:{unsubscribe(){}}}}; },
      async signInWithPassword(o){ return o.password==='rahasia123' ? login() : {data:null,error:{message:'Invalid login credentials'}}; },
      async signInWithOtp(o){ window.__otp=o; return {data:{},error:null}; },
      async verifyOtp(o){ return o.token_hash==='good'&&o.type==='email' ? login() : {data:null,error:{message:'Token has expired or is invalid'}}; },
      async setSession(){ return login(); }, async exchangeCodeForSession(){ return login(); },
      async signOut(){ localStorage.removeItem('mock_session'); cbs.forEach(cb=>cb('SIGNED_OUT',null)); return {error:null}; } };
    return { auth, from:t=>new Q(t),
      channel(){ const ch={ on(a,b,cb){ window.__rt=cb; return ch; }, subscribe(){ return ch; } }; return ch; },
      removeChannel(){ window.__rt=null; } }; } };
})();
