export interface GamepadSnapshot {
  deviceId: string;
  buttons: boolean[];
}

export interface GamepadButtonRef {
  deviceId: string;
  button: number;
}

export interface GamepadEdges {
  pressed: GamepadButtonRef[];
  released: GamepadButtonRef[];
}

export function readGamepadSnapshots(
  getGamepads: () => (Gamepad | null)[] = () =>
    typeof navigator !== "undefined" && typeof navigator.getGamepads === "function" ? navigator.getGamepads() : []
): GamepadSnapshot[] {
  return getGamepads()
    .filter((gamepad): gamepad is Gamepad => !!gamepad)
    .map((gamepad) => ({
      deviceId: gamepad.id,
      buttons: gamepad.buttons.map((button) => button.pressed),
    }));
}

export function diffGamepadSnapshots(prev: GamepadSnapshot[], curr: GamepadSnapshot[]): GamepadEdges {
  const pressed: GamepadButtonRef[] = [];
  const released: GamepadButtonRef[] = [];

  for (const currDevice of curr) {
    const prevDevice = prev.find((device) => device.deviceId === currDevice.deviceId);
    currDevice.buttons.forEach((isPressed, button) => {
      const wasPressed = prevDevice?.buttons[button] ?? false;
      if (isPressed && !wasPressed) pressed.push({ deviceId: currDevice.deviceId, button });
      if (!isPressed && wasPressed) released.push({ deviceId: currDevice.deviceId, button });
    });
  }

  return { pressed, released };
}
