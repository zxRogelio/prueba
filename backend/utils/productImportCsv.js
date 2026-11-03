import { parse } from "csv-parse/sync";

// Do not use csv-parse's vulnerable columns path. Header names never become
// properties of normal objects; reject prototype-related names explicitly.
export function parseProductImportCsv(text) {
  const rows = parse(text, { columns: false, skip_empty_lines: true, trim: true });
  if (!rows.length) return [];
  const [headers, ...values] = rows;
  if (headers.some((header) => ["__proto__", "constructor", "prototype"].includes(header))) {
    const error = new Error("El CSV contiene nombres de columnas no permitidos.");
    error.statusCode = 400;
    throw error;
  }
  return values.map((row) => {
    const record = Object.create(null);
    headers.forEach((header, index) => { record[header] = row[index]; });
    return record;
  });
}
