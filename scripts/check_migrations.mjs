import { readdir } from 'node:fs/promises';
const files = (await readdir('packages/storage/migrations')).filter((f)=>/^\d{3}_.+\.sql$/.test(f)).sort();
const numbers = files.map((f)=>Number(f.slice(0,3)));
for (let i=0;i<numbers.length;i++) if (numbers[i] !== i+1) throw new Error(`MIGRATION_SEQUENCE_GAP:expected=${String(i+1).padStart(3,'0')},found=${String(numbers[i]).padStart(3,'0')}`);
console.log(`OK: ${files.length} migrations are contiguous (${files[0]}..${files.at(-1)})`);
