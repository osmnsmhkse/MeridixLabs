interface Props {
  title?: string;
  columns: [string, string];
  rows: { label: string; a: string; b: string }[];
  caption?: string;
}

/**
 * ComparisonTable — a semantic, responsive side-by-side (e.g. AST vs ALT,
 * direct vs indirect bilirubin). Real <table> markup keeps it accessible and
 * indexable; theme-aware via surface/ink tokens.
 */
export default function ComparisonTable({ title, columns, rows, caption }: Props) {
  return (
    <figure className="my-8">
      {title && <figcaption className="text-sm font-bold text-ink mb-2.5">{title}</figcaption>}

      <div className="overflow-hidden rounded-2xl border border-surface-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-raised">
              <th scope="col" className="text-left font-semibold text-ink-tertiary text-xs uppercase tracking-wider px-4 py-3 w-1/3">
                <span className="sr-only">Attribute</span>
              </th>
              <th scope="col" className="text-left font-bold text-ink px-4 py-3">{columns[0]}</th>
              <th scope="col" className="text-left font-bold text-brand-blue px-4 py-3">{columns[1]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-surface-border align-top">
                <th scope="row" className="text-left font-semibold text-ink text-[13px] px-4 py-3 bg-surface-raised/50">
                  {r.label}
                </th>
                <td className="text-ink-secondary leading-relaxed px-4 py-3">{r.a}</td>
                <td className="text-ink-secondary leading-relaxed px-4 py-3">{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {caption && <figcaption className="mt-2 text-xs text-ink-tertiary leading-relaxed">{caption}</figcaption>}
    </figure>
  );
}
