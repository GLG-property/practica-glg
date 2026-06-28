// Utilitar simplu pentru a genera hash-uri bcrypt pentru PIN-uri.
// Folosire:  node scripts/hash-pins.mjs 1234 5678
// Afișează hash-ul bcrypt pentru fiecare PIN dat (pentru a-l pune manual în DB).
import bcrypt from "bcryptjs";

const pins = process.argv.slice(2);
if (pins.length === 0) {
  console.log("Folosire: node scripts/hash-pins.mjs <pin1> <pin2> ...");
  process.exit(0);
}

for (const pin of pins) {
  const hash = bcrypt.hashSync(pin, 10);
  console.log(`${pin} -> ${hash}`);
}
