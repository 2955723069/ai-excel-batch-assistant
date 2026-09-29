import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseSpreadsheet } from "../lib/jobs/excel.ts";

test("reads CSV headers and preserves original row values", () => {
  const parsed = parseSpreadsheet(Buffer.from("customer_id,customer_name,chat\n001,Sample A,Asked about pricing\n002,Sample B,Needs a demo"), "leads.csv", 1000);

  assert.deepEqual(parsed.columns, ["customer_id", "customer_name", "chat"]);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0]?.inputData.customer_id, "001");
  assert.equal(parsed.rows[1]?.inputData.chat, "Needs a demo");
});

test("reads XLSX workbook data from the first worksheet", () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["customer_id", "chat"],
    ["001", "Needs a product demo"],
  ]), "Leads");
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const parsed = parseSpreadsheet(bytes, "leads.xlsx", 1000);

  assert.deepEqual(parsed.columns, ["customer_id", "chat"]);
  assert.equal(parsed.rows[0]?.inputData.customer_id, "001");
  assert.equal(parsed.rows[0]?.inputData.chat, "Needs a product demo");
});

test("rejects workbooks whose non-empty data rows exceed the configured limit", () => {
  assert.throws(
    () => parseSpreadsheet(Buffer.from("conversation\nfirst\nsecond"), "leads.csv", 1),
    /超过 1 条记录/,
  );
});

test("rejects ambiguous duplicate or blank headers", () => {
  assert.throws(
    () => parseSpreadsheet(Buffer.from("conversation,conversation\nfirst,second"), "leads.csv", 1000),
    /列名不能为空且不能重复/,
  );
});

test("keeps original worksheet row numbers when blank rows appear", () => {
  const parsed = parseSpreadsheet(Buffer.from("chat\nfirst\n\nsecond"), "leads.csv", 1000);

  assert.equal(parsed.rows[0]?.rowNumber, 2);
  assert.equal(parsed.rows[1]?.rowNumber, 4);
});
