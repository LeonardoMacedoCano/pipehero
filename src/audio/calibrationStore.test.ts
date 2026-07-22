import test from "node:test";
import assert from "node:assert/strict";
import { getCalibration, setCalibration } from "./calibrationStore.js";

function withFakeLocalStorage(fn: () => void): void {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => store.set(key, String(value)),
  } as unknown as Storage;
  try {
    fn();
  } finally {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  }
}

test("without localStorage (non-browser environment), returns 0 without breaking", () => {
  assert.equal(getCalibration(), 0);
});

test("setCalibration/getCalibration round-trip", () => {
  withFakeLocalStorage(() => {
    setCalibration(0.045);
    assert.equal(getCalibration(), 0.045);
  });
});

test("accepts negative values", () => {
  withFakeLocalStorage(() => {
    setCalibration(-0.08);
    assert.equal(getCalibration(), -0.08);
  });
});

test("no value saved yet, returns 0", () => {
  withFakeLocalStorage(() => {
    assert.equal(getCalibration(), 0);
  });
});

test("corrupted value in localStorage doesn't break, returns 0", () => {
  withFakeLocalStorage(() => {
    globalThis.localStorage.setItem("pipehero:calibrationSeconds", "not-a-number");
    assert.equal(getCalibration(), 0);
  });
});
