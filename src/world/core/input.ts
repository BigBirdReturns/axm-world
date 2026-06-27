import { useEffect, useRef } from "react";

export interface WorldInputState {
  /** Strafe (x) and forward/back (y) in [-1, 1]. y > 0 is forward. */
  move: { x: number; y: number };
  /** Yaw delta accumulated from pointer/touch drag, consumed each frame. */
  turn: number;
  /** True while a jump is requested. */
  jump: boolean;
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
  });

  // Track the raw key set so opposite keys cancel and release works correctly.
  const keysRef = useRef<Set<string>>(new Set());

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
      stateRef.current.move.x = x;
      stateRef.current.move.y = y;
      stateRef.current.jump = keys.has(" ") || keys.has("space");
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
      recomputeMove();
      draggingRef.current = false;
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
    const onPointerUp = () => endDrag();

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) startDrag(t.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) moveDrag(t.clientX);
    };
    const onTouchEnd = () => endDrag();

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
    };
  }, []);

  const inputRef = useRef<WorldInput>({
    read: () => {
      const s = stateRef.current;
      const snapshot: WorldInputState = {
        move: { x: s.move.x, y: s.move.y },
        turn: s.turn,
        jump: s.jump,
      };
      // Consume the accumulated yaw delta.
      s.turn = 0;
      return snapshot;
    },
  });

  return inputRef.current;
}
