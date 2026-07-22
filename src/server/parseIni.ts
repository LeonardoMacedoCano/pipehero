export type IniData = Record<string, Record<string, string>>;

export function parseIni(raw: string): IniData {
  const result: IniData = {};
  let currentSection: string | null = null;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase();
      result[currentSection] = {};
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1 || !currentSection) continue;

    const key = line.slice(0, eqIndex).trim().toLowerCase();
    const value = line.slice(eqIndex + 1).trim();
    result[currentSection][key] = value;
  }

  return result;
}
