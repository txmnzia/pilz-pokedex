import { useEffect, useRef } from "react";

/** Keys an on-screen dialog (cropper, comparison, full-screen photo) takes over from the Pokédex hardware buttons.
 *  While one is open, every hardware button is swallowed: OK validates, BACK cancels, CATCH picks another photo. */
export interface OverlayKeys { ok?(): void; back?(): void; left?(): void; right?(): void; other?(f: File): void }

const stack: { current: OverlayKeys }[] = [];
export const topOverlay = (): OverlayKeys | null => stack[stack.length - 1]?.current ?? null;

/** Register the dialog's keys while it is mounted (always calls the latest handlers). */
export function useOverlay(keys: OverlayKeys) {
  const ref = useRef(keys); ref.current = keys;
  useEffect(() => { stack.push(ref); return () => { const i = stack.indexOf(ref); if (i >= 0) stack.splice(i, 1); }; }, []);
}
