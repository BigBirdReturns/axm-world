import { useEffect, useRef } from "react";

export interface WorldInputState {
  /** Strafe (x) and forward/back (y) in [-1, 1]. y > 0 is forward. */
  move: { x: number; y: number };
  /** Yaw delta accumulated from pointer/touch drag, consumed each frame. */
  turn: number;
  /** True while a jump is requested. */
  jump: boolean;
  /** One-shot local movement requested by a tap, consumed exactly once. */
  impulse: { x: number; y: number };
}

export interface WorldInput {
  /**
   * Read the current input. `turn` is the accumulated yaw delta since the last
   * read and is reset to 0 on every call (consume-each-frame semantics).
   */
  read: () => WorldInputState;
}

/** Sensitivity (radians of yaw per pixel of horizontal drag). */
const TURN_SENSITIVITY = 0.005;

export const VIRTUAL_WORLD_INPUT_EVENT = "axm-world:virtual-input";

export interface VirtualWorldInput {
  x?: number;
  y?: number;
  jump?: boolean;
  impulse?: boolean;
}

/** Bridge accessible on-screen controls into the same controller input seam. */
export function setVirtualWorldInput(input: VirtualWorldInput): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<VirtualWorldInput>(VIRTUAL_WORLD_INPUT_EVENT, { detail: input }));
}

/**
 * Live keyboard + pointer/touch input for the planet controller.
 *
 * Keyboard: WASD / arrow keys drive the move vector, Space requests a jump.
 * Pointer or touch drag anywhere in the window accumulates a yaw `turn` delta
 * that the controller consumes (and zeroes) each frame.
 */
export function useWorldInput(): WorldInput {
  const stateRef = useRef<WorldInputState>({
    move: { x: 0, y: 0 },
    turn: 0,
    jump: false,
    impulse: { x: 0, y: 0 },
  });

  // Track the raw key set so opposite keys cancel and release works correctly.
  const keysRef = useRef<Set<string>>(new Set());
  const virtualRef = useRef({ x: 0, y: 0, jump: false });

  // Pointer drag tracking.
  const draggingRef = useRef<boolean>(false);
  const lastXRef = useRef<number>(0);

  useEffect(() => {
    const keys = keysRef.current;

    const recomputeMove = () => {
      let x = 0;
      let y = 0;
      if (keys.has("w") || keys.has("arrowup")) y += 1;
      if (keys.has("s") || keys.has("arrowdown")) y -= 1;
      if (keys.has("d") || keys.has("arrowright")) x += 1;
      if (keys.has("a") || keys.has("arrowleft")) x -= 1;
      stateRef.current.move.x = Math.max(-1, Math.min(1, x + virtualRef.current.x));
      stateRef.current.move.y = Math.max(-1, Math.min(1, y + virtualRef.current.y));
      stateRef.current.jump = keys.has(" ") || keys.has("space") || virtualRef.current.jump;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        k === "w" || k === "a" || k === "s" || k === "d" ||
        k === "arrowup" || k === "arrowdown" || k === "arrowleft" || k === "arrowright" ||
        k === " "
      ) {
        keys.add(k === " " ? " " : k);
        recomputeMove();
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.delete(k === " " ? " " : k);
      recomputeMove();
    };

    // Lose focus -> drop all keys so the player doesn't keep walking.
    const onBlur = () => {
      keys.clear();
      virtualRef.current = { x: 0, y: 0, jump: false };
      recomputeMove();
      draggingRef.current = false;
    };

    const onVirtualInput = (event: Event) => {
      const detail = (event as CustomEvent<VirtualWorldInput>).detail ?? {};
      if (detail.impulse) {
        stateRef.current.impulse.x += detail.x ?? 0;
        stateRef.current.impulse.y += detail.y ?? 0;
        return;
      }
      virtualRef.current = {
        x: detail.x ?? virtualRef.current.x,
        y: detail.y ?? virtualRef.current.y,
        jump: detail.jump ?? virtualRef.current.jump,
      };
      recomputeMove();
    };

    const startDrag = (clientX: number) => {
      draggingRef.current = true;
      lastXRef.current = clientX;
    };
    const moveDrag = (clientX: number) => {
      if (!draggingRef.current) return;
      const dx = clientX - lastXRef.current;
      lastXRef.current = clientX;
      stateRef.current.turn += dx * TURN_SENSITIVITY;
    };
    const endDrag = () => {
      draggingRef.current = false;
    };

    const onPointerDown = (e: PointerEvent) => startDrag(e.clientX);
    const onPointerMove = (e: PointerEvent) => moveDrag(e.clientX);
    const releaseVirtualMovement = () => {
      virtualRef.current = { x: 0, y: 0, jump: false };
      recomputeMove();
    };
    const onPointerUp = () => {
      endDrag();
      releaseVirtualMovement();
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) startDrag(t.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) moveDrag(t.clientX);
    };
    const onTouchEnd = () => {
      endDrag();
      releaseVirtualMovement();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener(VIRTUAL_WORLD_INPUT_EVENT, onVirtualInput);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener(VIRTUAL_WORLD_INPUT_EVENT, onVirtualInput);
    };
  }, []);

  const inputRef = useRef<WorldInput>({
    read: () => {
      const s = stateRef.current;
      const snapshot: WorldInputState = {
        move: { x: s.move.x, y: s.move.y },
        turn: s.turn,
        jump: s.jump,
        impulse: { x: s.impulse.x, y: s.impulse.y },
      };
      // Consume the accumulated yaw delta.
      s.turn = 0;
      s.impulse.x = 0;
      s.impulse.y = 0;
      return snapshot;
    },
  });

  return inputRef.current;
}
