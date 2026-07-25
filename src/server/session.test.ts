import test from "node:test";
import assert from "node:assert/strict";
import { signValue, verifySignedValue } from "./session.js";

test("signValue/verifySignedValue round-trip returns the original value", () => {
  const signed = signValue("abc123", "s3cr3t");
  assert.equal(verifySignedValue(signed, "s3cr3t"), "abc123");
});

test("verifySignedValue rejects a value signed with a different secret", () => {
  const signed = signValue("abc123", "s3cr3t");
  assert.equal(verifySignedValue(signed, "wrong-secret"), null);
});

test("verifySignedValue rejects a tampered value with the original signature kept", () => {
  const signed = signValue("abc123", "s3cr3t");
  const [, signature] = signed.split(".");
  const tampered = `xyz999.${signature}`;
  assert.equal(verifySignedValue(tampered, "s3cr3t"), null);
});

test("verifySignedValue rejects a malformed value with no signature", () => {
  assert.equal(verifySignedValue("no-dot-here", "s3cr3t"), null);
});

test("verifySignedValue rejects a signature of the wrong length", () => {
  const signed = signValue("abc123", "s3cr3t");
  assert.equal(verifySignedValue(`${signed}extra`, "s3cr3t"), null);
});

test("signValue is deterministic for the same value/secret", () => {
  assert.equal(signValue("abc123", "s3cr3t"), signValue("abc123", "s3cr3t"));
});
