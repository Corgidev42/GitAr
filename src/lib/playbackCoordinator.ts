/** Une seule pré-écoute à la fois (rythmique, arpège, etc.). */

let active: { token: object; stop: () => void } | null = null;

export function claimExclusivePlayback(token: object, stop: () => void): void {
  if (active && active.token !== token) {
    try {
      active.stop();
    } catch {
      /* ignore */
    }
  }
  active = { token, stop };
}

export function releaseExclusivePlayback(token: object): void {
  if (active?.token === token) active = null;
}
