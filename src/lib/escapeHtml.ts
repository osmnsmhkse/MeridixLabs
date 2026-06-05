// Escape a string for safe interpolation into an HTML document (e.g. the
// transactional emails we build by string-concatenation). Prevents HTML/attribute
// injection when the value is attacker-influenced (the /api/send-email body is
// public, so its fields must be treated as untrusted).
export function escapeHtml(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
