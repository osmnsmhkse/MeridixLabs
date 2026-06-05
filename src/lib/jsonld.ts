// Safely serialize an object for inlining inside a <script type="application/ld+json">
// tag. Escapes `<` so a value containing `</script>` (or `<!--`) cannot break
// out of the script element. Our JSON-LD uses non-user data today, but blog
// FAQ content is author-supplied — this is cheap defense-in-depth.
export function jsonLdString(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
