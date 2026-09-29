import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedSpreadsheet } from "@/lib/jobs/excel";

export type LocalJobItem = {
  row_number: number;
  input_data: Record<string, string>;
  status: "pending" | "processing" | "completed" | "failed" | "retrying" | "cancelled";
  retry_count: number;
  extracted_data?: unknown;
  jev_result?: unknown;
  sales_advice?: unknown;
  error_message?: string | null;
  completed_at?: string | null;
};

export type LocalJob = {
  id: string;
  owner_id: string;
  filename: string;
  template_id: string;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  status: "uploading" | "queued" | "processing" | "paused" | "completed" | "failed" | "cancelled";
  input_mapping: { conversation: string; customer_id: string | null; customer_name: string | null };
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_cost: number;
  actual_cost: number;
  items: LocalJobItem[];
};

type CreateJobInput = {
  ownerId: string;
  filename: string;
  templateId: string;
  mapping: LocalJob["input_mapping"];
  inputBuffer: Buffer;
  rows: ParsedSpreadsheet["rows"];
};

export function getJobsDataDir() {
  return process.env.JOBS_DATA_DIR?.trim() || path.join(process.cwd(), "data");
}

export async function createLocalJob(input: CreateJobInput): Promise<string> {
  const id = randomUUID();
  const directory = getJobDirectory(id);
  await mkdir(directory, { recursive: true });
  const now = new Date().toISOString();
  const job: Omit<LocalJob, "items"> = {
    id,
    owner_id: input.ownerId,
    filename: input.filename,
    template_id: input.templateId,
    total_rows: input.rows.length,
    processed_rows: 0,
    success_rows: 0,
    failed_rows: 0,
    status: "queued",
    input_mapping: input.mapping,
    created_at: now,
    started_at: null,
    completed_at: null,
    estimated_cost: 0,
    actual_cost: 0,
  };
  const items: LocalJobItem[] = input.rows.map((row) => ({
    row_number: row.rowNumber,
    input_data: row.inputData,
    status: "pending",
    retry_count: 0,
    error_message: null,
    completed_at: null,
  }));
  await writeJson(path.join(directory, "job.json"), job);
  await writeJsonLines(path.join(directory, "items.jsonl"), items);
  await writeFile(path.join(directory, "input.xlsx"), input.inputBuffer);
  return id;
}

export async function listLocalJobs(ownerId: string): Promise<Array<Omit<LocalJob, "items">>> {
  const directories = await readdir(path.join(getJobsDataDir(), "jobs"), { withFileTypes: true }).catch(() => []);
  const jobs: Array<Omit<LocalJob, "items">> = [];
  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    const job = await readJobMetadata(directory.name).catch(() => null);
    if (job?.owner_id === ownerId) jobs.push(job);
  }
  return jobs.sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export async function getLocalJob(id: string, ownerId: string): Promise<LocalJob | null> {
  if (!isSafeJobId(id)) return null;
  const job = await readJobMetadata(id).catch(() => null);
  if (!job || (ownerId !== "*" && job.owner_id !== ownerId)) return null;
  const items = await readJsonLines<LocalJobItem>(path.join(getJobDirectory(id), "items.jsonl"));
  return { ...job, items };
}

export async function getLocalJobForWorker(id: string): Promise<LocalJob | null> {
  if (!isSafeJobId(id)) return null;
  const job = await readJobMetadata(id).catch(() => null);
  if (!job) return null;
  const items = await readJsonLines<LocalJobItem>(path.join(getJobDirectory(id), "items.jsonl"));
  return { ...job, items };
}

export async function updateLocalItem(id: string, rowNumber: number, patch: Partial<LocalJobItem>): Promise<void> {
  if (!isSafeJobId(id)) throw new Error("Invalid job id");
  const itemPath = path.join(getJobDirectory(id), "items.jsonl");
  const items = await readJsonLines<LocalJobItem>(itemPath);
  const index = items.findIndex((item) => item.row_number === rowNumber);
  if (index < 0) throw new Error("Job item not found");
  items[index] = { ...items[index], ...patch };
  await writeJsonLines(itemPath, items);
}

export async function updateLocalJob(id: string, patch: Partial<Omit<LocalJob, "items">>): Promise<void> {
  if (!isSafeJobId(id)) throw new Error("Invalid job id");
  const job = await readJobMetadata(id);
  await writeJson(path.join(getJobDirectory(id), "job.json"), { ...job, ...patch });
}

export async function deleteLocalJob(id: string) {
  await rm(getJobDirectory(id), { recursive: true, force: true });
}

function getJobDirectory(id: string) {
  return path.join(getJobsDataDir(), "jobs", id);
}

function isSafeJobId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

async function readJobMetadata(id: string): Promise<Omit<LocalJob, "items">> {
  return readJson<Omit<LocalJob, "items">>(path.join(getJobDirectory(id), "job.json"));
}

async function writeJson(filePath: string, value: unknown) {
  await atomicWrite(filePath, JSON.stringify(value, null, 2));
}

async function writeJsonLines(filePath: string, values: unknown[]) {
  await atomicWrite(filePath, values.map((value) => JSON.stringify(value)).join("\n") + (values.length ? "\n" : ""));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content.split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}

async function atomicWrite(filePath: string, content: string | Buffer) {
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, content, "utf8");
  await rename(tempPath, filePath);
}
