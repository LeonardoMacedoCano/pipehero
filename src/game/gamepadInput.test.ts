import test from "node:test";
import assert from "node:assert/strict";
import { diffGamepadSnapshots, readGamepadSnapshots, type GamepadSnapshot } from "./gamepadInput.js";

test("readGamepadSnapshots with no Gamepad API support returns an empty list", () => {
  assert.deepEqual(readGamepadSnapshots(), []);
});

test("readGamepadSnapshots maps connected gamepads' button.pressed into plain snapshots", () => {
  const fakeGamepads = [
    null,
    {
      id: "Fake Guitar",
      index: 1,
      buttons: [{ pressed: true }, { pressed: false }, { pressed: false }],
    },
  ] as unknown as (Gamepad | null)[];

  const snapshots = readGamepadSnapshots(() => fakeGamepads);
  assert.deepEqual(snapshots, [{ deviceId: "Fake Guitar#1", buttons: [true, false, false] }]);
});

test("readGamepadSnapshots disambiguates two identical-model controllers by index", () => {
  const fakeGamepads = [
    { id: "Same Model Guitar", index: 0, buttons: [{ pressed: true }] },
    { id: "Same Model Guitar", index: 1, buttons: [{ pressed: false }] },
  ] as unknown as (Gamepad | null)[];

  const snapshots = readGamepadSnapshots(() => fakeGamepads);
  assert.deepEqual(snapshots, [
    { deviceId: "Same Model Guitar#0", buttons: [true] },
    { deviceId: "Same Model Guitar#1", buttons: [false] },
  ]);
});

test("diffGamepadSnapshots: a button going from unpressed to pressed is a 'pressed' edge", () => {
  const prev: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [false, false] }];
  const curr: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [true, false] }];
  const edges = diffGamepadSnapshots(prev, curr);
  assert.deepEqual(edges.pressed, [{ deviceId: "guitar", button: 0 }]);
  assert.deepEqual(edges.released, []);
});

test("diffGamepadSnapshots: a button going from pressed to unpressed is a 'released' edge", () => {
  const prev: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [true, false] }];
  const curr: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [false, false] }];
  const edges = diffGamepadSnapshots(prev, curr);
  assert.deepEqual(edges.released, [{ deviceId: "guitar", button: 0 }]);
  assert.deepEqual(edges.pressed, []);
});

test("diffGamepadSnapshots: a button held across frames produces no edges", () => {
  const prev: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [true] }];
  const curr: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [true] }];
  const edges = diffGamepadSnapshots(prev, curr);
  assert.deepEqual(edges, { pressed: [], released: [] });
});

test("diffGamepadSnapshots: tracks edges per device independently", () => {
  const prev: GamepadSnapshot[] = [
    { deviceId: "guitar-1", buttons: [false] },
    { deviceId: "guitar-2", buttons: [true] },
  ];
  const curr: GamepadSnapshot[] = [
    { deviceId: "guitar-1", buttons: [true] },
    { deviceId: "guitar-2", buttons: [false] },
  ];
  const edges = diffGamepadSnapshots(prev, curr);
  assert.deepEqual(edges.pressed, [{ deviceId: "guitar-1", button: 0 }]);
  assert.deepEqual(edges.released, [{ deviceId: "guitar-2", button: 0 }]);
});

test("diffGamepadSnapshots: a device that appears for the first time already pressed counts as a 'pressed' edge", () => {
  const prev: GamepadSnapshot[] = [];
  const curr: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [true] }];
  const edges = diffGamepadSnapshots(prev, curr);
  assert.deepEqual(edges.pressed, [{ deviceId: "guitar", button: 0 }]);
});

test("diffGamepadSnapshots: a device that disconnects mid-hold releases every button it was holding", () => {
  const prev: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [true, false, true] }];
  const curr: GamepadSnapshot[] = [];
  const edges = diffGamepadSnapshots(prev, curr);
  assert.deepEqual(edges.pressed, []);
  assert.deepEqual(edges.released, [
    { deviceId: "guitar", button: 0 },
    { deviceId: "guitar", button: 2 },
  ]);
});

test("diffGamepadSnapshots: a device that disconnects with nothing held produces no edges", () => {
  const prev: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [false, false] }];
  const curr: GamepadSnapshot[] = [];
  const edges = diffGamepadSnapshots(prev, curr);
  assert.deepEqual(edges, { pressed: [], released: [] });
});
