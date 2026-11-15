// Jalankan semua uji: node tests/run.js   (gagal bila ada satu saja FAIL atau error)
const { execFileSync } = require('child_process'), path = require('path'), fs = require('fs');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && !['run.js', '_app.js', 'mock-sb.js'].includes(f)).sort();
let pass = 0, fail = 0;
for (const f of files) {
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = (e.stdout || '') + '\nFAIL proses berhenti: ' + (e.stderr || e.message).split('\n')[0]; }
  const p = (out.match(/^PASS /gm) || []).length, x = (out.match(/^FAIL /gm) || []).length + (/PAGEERROR/.test(out) ? 1 : 0);
  pass += p; fail += x;
  console.log((x ? '✗ ' : '✓ ') + f.padEnd(24) + p + ' lolos' + (x ? ', ' + x + ' gagal' : ''));
  if (x) out.split('\n').filter(l => /^FAIL|PAGEERROR/.test(l)).forEach(l => console.log('    ' + l));
}
console.log('\n' + pass + ' lolos, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
