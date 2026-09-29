import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalJob, getLocalJob, listLocalJobs, updateLocalItem } from "../lib/jobs/local-store.ts";

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

test("creates a local job directory with input and resumable item state", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ai-batch-test-"));
  tempDirs.push(directory);
  process.env.JOBS_DATA_DIR = directory;
  const id = await createLocalJob({
    ownerId: "owner-1",
    filename: "customers.xlsx",
    templateId: "sales-lead",
    mapping: { conversation: "conversation", customer_id: null, customer_name: "customer_name" },
    inputBuffer: Buffer.from("original file"),
    rows: [{ rowNumber: 2, inputData: { conversation: "hello", customer_name: "A" } }, { rowNumber: 3, inputData: { conversation: "bye", customer_name: "B" } }],
  });

  const job = await getLocalJob(id, "owner-1");
  assert.equal(job?.total_rows, 2);
  assert.equal(job?.items.find((item) => item.row_number === 2)?.status, "pending");
  assert.equal(await fs.readFile(path.join(directory, "jobs", id, "input.xlsx"), "utf8"), "original file");

  await updateLocalItem(id, 2, { status: "completed", extracted_data: { customer_type: "enterprise" } });
  const resumed = await getLocalJob(id, "owner-1");
  assert.deepEqual(resumed?.items.filter((item) => item.status !== "completed").map((item) => item.row_number), [3]);
});

test("does not expose jobs belonging to another local owner", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ai-batch-test-"));
  tempDirs.push(directory);
  process.env.JOBS_DATA_DIR = directory;
  await createLocalJob({ ownerId: "owner-a", filename: "a.csv", templateId: "sales-lead", mapping: { conversation: "chat", customer_id: null, customer_name: null }, inputBuffer: Buffer.from("a"), rows: [{ rowNumber: 2, inputData: { chat: "hello" } }] });
  await createLocalJob({ ownerId: "owner-b", filename: "b.csv", templateId: "sales-lead", mapping: { conversation: "chat", customer_id: null, customer_name: null }, inputBuffer: Buffer.from("b"), rows: [{ rowNumber: 2, inputData: { chat: "hello" } }] });

  assert.equal((await listLocalJobs("owner-a")).length, 1);
  assert.equal((await listLocalJobs("owner-a"))[0]?.filename, "a.csv");
});
