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

/** A screen's own OK action (v0.16.6: the catch screen saves with OK), used when no dialog is open. Other keys keep their
 *  normal job (D-pad scrolls, BACK leaves the screen). */
const okStack: { current: () => void }[] = [];
export const screenOk = (): (() => void) | null => okStack[okStack.length - 1]?.current ?? null;
export function useOkKey(fn: () => void) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => { okStack.push(ref); return () => { const i = okStack.indexOf(ref); if (i >= 0) okStack.splice(i, 1); }; }, []);
}
