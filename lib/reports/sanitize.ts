// pdf-lib + fonturile standard (Helvetica) suportă doar Latin-1.
// Numele rusești (chirilice) și diacriticele românești ar arunca erori la desenare.
// De aceea, pentru PDF transliterăm în ASCII lizibil. (Excel nu are această limitare.)

const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function latinize(input: string | null | undefined): string {
  if (!input) return "";
  let out = "";
  for (const ch of input) {
    const lower = ch.toLowerCase();
    if (CYRILLIC[lower] !== undefined) {
      const tr = CYRILLIC[lower];
      out += ch === lower ? tr : tr.charAt(0).toUpperCase() + tr.slice(1);
    } else {
      out += ch;
    }
  }
  // Eliminăm diacriticele românești (ă, â, î, ș, ț) prin normalizare.
  out = out.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // Caractere rămase în afara Latin-1 -> înlocuite cu spațiu, ca să nu crape.
  out = out.replace(/[^\x00-\xff]/g, " ");
  return out;
}
