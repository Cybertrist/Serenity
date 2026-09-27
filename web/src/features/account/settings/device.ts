/** Reading the label the server keeps for a device session: the user agent it came with. */

export const PHONE = /Android|iPhone|iPad|Mobile/i;

/**
 * "Chrome sur Windows" rather than a user agent: the server keeps the raw string the browser
 * sent, this only reads it. Anything it does not recognise stays as it came, cut short.
 */
export function deviceName(agent: string): string {
  if (/Electron|Serenity/i.test(agent)) {
    const os = /Windows/i.test(agent) ? "Windows" : /Linux/i.test(agent) ? "Linux" : "macOS";
    return `Appli de bureau sur ${os}`;
  }
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Firefox\//.test(agent)
      ? "Firefox"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : null;
  const os = /Android/i.test(agent)
    ? "Android"
    : /iPhone|iPad/i.test(agent)
      ? "iOS"
      : /Windows/i.test(agent)
        ? "Windows"
        : /Mac OS X/i.test(agent)
          ? "macOS"
          : /Linux/i.test(agent)
            ? "Linux"
            : null;
  if (browser && os) return `${browser} sur ${os}`;
  return agent.slice(0, 40) || "Appareil";
}
