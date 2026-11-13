/**
 * Pulls one function's source out of a file, so the page always shows the
 * code that is actually running rather than a copy that could drift.
 * Functions in triage.ts end with a closing brace at the start of a line.
 */
export function extractFunction(source: string, name: string): string {
  let start = source.indexOf(`export function ${name}(`)
  if (start < 0) return `// ${name} not found`
  // Include the doc comment directly above the function, if there is one
  if (source.slice(0, start).endsWith('*/\n')) start = source.lastIndexOf('/**', start)
  const end = source.indexOf('\n}\n', start)
  return source.slice(start, end + 2)
}
