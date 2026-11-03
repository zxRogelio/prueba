import test from "node:test";
import assert from "node:assert/strict";
import { parseProductImportCsv } from "../utils/productImportCsv.js";

test("catalog CSV preserves quoted commas, accents, trimming and blank lines", () => {
  const records = parseProductImportCsv('name,price,description\n"Proteína, vainilla", 100.50 ,"Texto"\n\n');
  assert.equal(records.length, 1);
  assert.deepEqual({ ...records[0] }, { name: "Proteína, vainilla", price: "100.50", description: "Texto" });
  assert.equal(Object.getPrototypeOf(records[0]), null);
});

test("catalog CSV rejects prototype-related headers before staging", () => {
  for (const header of ["__proto__", "constructor", "prototype"]) {
    assert.throws(() => parseProductImportCsv(`${header},name\nmalicious,Product`), (error) => error.statusCode === 400);
  }
  assert.equal(Object.prototype.malicious, undefined);
});

test("catalog CSV keeps empty, header-only and malformed-row behavior", () => {
  assert.deepEqual(parseProductImportCsv(""), []);
  assert.deepEqual(parseProductImportCsv("name,price\n"), []);
  assert.throws(() => parseProductImportCsv("name,price\nProduct,100,extra"));
});
