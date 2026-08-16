import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/app.ts", "utf8");
const storage = fs.readFileSync("src/storage.ts", "utf8");
const logging = fs.readFileSync("src/logging.ts", "utf8");
const types = fs.readFileSync("src/core/types.ts", "utf8");
const gas = fs.readFileSync("backend/Code.gs", "utf8");

test("diagnosis and scene timing are persisted and sent", () => {
  assert.match(storage, /startedAt: string/);
  assert.match(types, /durationMs\?: number/);
  assert.match(app, /historyEntry\.durationMs = sceneDurationMs/);
  assert.match(logging, /durationSec/);
  assert.match(app, /scene_answered/);
  assert.match(app, /session_started/);
});

test("GAS consumes timing fields and uppercase LUCK", () => {
  assert.match(gas, /payload\.startedAt/);
  assert.match(gas, /payload\.durationSec/);
  assert.match(gas, /entry\.durationMs/);
  assert.match(gas, /valueOfAbility_\(abilities, 'LUCK'\)/);
});
