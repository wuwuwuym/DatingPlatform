/** Must match the SQL function app.pair_key(a, b) exactly. */
export function pairKeyOf(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
