import { getAvatarOption, type AvatarOption } from "./avatarCatalog.js";

export function resolveAvatarOption(equippedAvatarId: string | null): AvatarOption | null {
  return (equippedAvatarId ? getAvatarOption(equippedAvatarId) : undefined) ?? null;
}
