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
      buttons: [{ pressed: true }, { pressed: false }, { pressed: false }],
    },
  ] as unknown as (Gamepad | null)[];

  const snapshots = readGamepadSnapshots(() => fakeGamepads);
  assert.deepEqual(snapshots, [{ deviceId: "Fake Guitar", buttons: [true, false, false] }]);
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

test("diffGamepadSnapshots: a device that disconnects mid-hold doesn't produce a stray 'released' for the vanished device", () => {
  const prev: GamepadSnapshot[] = [{ deviceId: "guitar", buttons: [true] }];
  const curr: GamepadSnapshot[] = [];
  const edges = diffGamepadSnapshots(prev, curr);
  assert.deepEqual(edges, { pressed: [], released: [] });
});
