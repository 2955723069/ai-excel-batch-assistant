import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getLocalSettings, saveLocalSettings } from "../lib/settings.ts";

const dirs = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

test("saves settings locally and returns masked secrets", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-settings-"));
  dirs.push(dir);
  process.env.JOBS_DATA_DIR = dir;
  await saveLocalSettings({ llm_api_key: "secret-key", llm_base_url: "https://llm.example/v1", llm_model: "model-a", jev_api_key: "jev-secret", jev_base_url: "https://jev.example" });
  const settings = await getLocalSettings();
  assert.equal(settings.llm_model, "model-a");
  assert.equal(settings.llm_api_key_configured, true);
  assert.equal(settings.llm_api_key, undefined);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir, "settings.json"), "utf8")).llm_api_key, "secret-key");
});
