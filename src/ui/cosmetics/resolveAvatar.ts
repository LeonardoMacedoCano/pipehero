import { getAvatarOption, avatarDataUri } from "./avatarCatalog.js";

export function resolveAvatarSrc(equippedAvatarId: string | null): string {
  const option = equippedAvatarId ? getAvatarOption(equippedAvatarId) : undefined;
  return option ? avatarDataUri(option) : "/pipehero-icon.png";
}
