import { readFile, writeFile, rename } from 'node:fs/promises';

const SOURCE_URL = 'https://streamxhd.com/eventos.json';
const OUTPUT_FILE = 'eventos.json';
const TEMP_FILE = `${OUTPUT_FILE}.tmp`;

const response = await fetch(SOURCE_URL, {
  headers: {
    'User-Agent': 'data-sport-nexa-github-sync/1.0',
    'Accept': 'application/json'
  }
});

if (!response.ok) {
  throw new Error(`Gagal mengambil sumber: HTTP ${response.status}`);
}

const text = await response.text();
if (!text.trim()) throw new Error('Respons kosong. File GitHub tidak diubah.');

let data;
try {
  data = JSON.parse(text);
} catch (err) {
  throw new Error(`JSON sumber tidak valid: ${err.message}`);
}

// Pemeriksaan minimum agar data yang rusak tidak menimpa eventos.json.
if (!data || typeof data !== 'object' || !Array.isArray(data.sports)) {
  throw new Error('Format eventos.json tidak sesuai: properti "sports" tidak ditemukan.');
}

let leagueCount = 0;
let eventCount = 0;
for (const sport of data.sports) {
  if (!sport || typeof sport !== 'object') continue;
  if (!Array.isArray(sport.leagues)) continue;
  leagueCount += sport.leagues.length;
  for (const league of sport.leagues) {
    if (league && Array.isArray(league.events)) eventCount += league.events.length;
  }
}

if (eventCount === 0) {
  throw new Error('Sumber berhasil dibaca tetapi tidak memiliki event. File GitHub tidak diubah.');
}

// Tulis atomik: jika proses gagal, eventos.json lama tetap aman.
await writeFile(TEMP_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
await rename(TEMP_FILE, OUTPUT_FILE);

console.log(`Sinkronisasi berhasil: ${data.sports.length} olahraga, ${leagueCount} liga, ${eventCount} event.`);
console.log(`Sumber: ${SOURCE_URL}`);
