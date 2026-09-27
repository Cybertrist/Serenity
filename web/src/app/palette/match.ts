/** Search for the palette: accents and case do not matter, the start of a word counts more. */

function fold(char: string): string {
  return char.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function normalise(text: string): string {
  return Array.from(text, fold).join("");
}

export interface Match {
  score: number;
  /** [start, end) in the original text, to highlight. */
  range: [number, number] | null;
}

/**
 * How well `query` matches `text`: 3 at the start, 2 at the start of a word, 1 anywhere, 0 not
 * at all. The range points into the original text, accents included.
 */
export function match(text: string, query: string): Match {
  const q = normalise(query.trim());
  if (!q) return { score: 1, range: null };
  // Keep a map from each folded character back to its place in the original text.
  const chars = Array.from(text);
  let folded = "";
  const origin: number[] = [];
  let offset = 0;
  for (const c of chars) {
    const f = fold(c);
    for (let k = 0; k < f.length; k += 1) origin.push(offset);
    folded += f;
    offset += c.length;
  }
  origin.push(offset);
  const at = folded.indexOf(q);
  if (at === -1) return { score: 0, range: null };
  const start = origin[at] ?? 0;
  const end = origin[at + q.length] ?? text.length;
  const before = folded[at - 1];
  const score = at === 0 ? 3 : before === undefined || /[\s\-_.@/]/.test(before) ? 2 : 1;
  return { score, range: [start, end] };
}
