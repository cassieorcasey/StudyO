// Lokasi bersama untuk semua uji: aplikasi hasil build, mock Supabase, dan folder tangkapan layar.
const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
module.exports = {
  APP: 'file://' + path.resolve(__dirname, '..', 'index.html'),
  MOCK: fs.readFileSync(path.join(__dirname, 'mock-sb.js'), 'utf8'),
  shot: name => path.join(OUT, name)
};
// Uji lama untuk mesin timer membuka layar Timer langsung (layar pertama aplikasi sekarang Catat)
module.exports.TIMER = module.exports.APP + '#timer';
