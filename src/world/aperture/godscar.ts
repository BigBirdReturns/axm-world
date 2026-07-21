import type { Arc } from "../../engine/types.js";
import { readGodscarPocketExtension } from "../../godscar/compiler.js";
import { GODSCAR_EXTENSION_KEY, type GodscarPocketSource } from "../../godscar/types.js";

export type GodscarPocketInspection =
  | { status: "none" }
  | { status: "valid"; source: GodscarPocketSource }
  | { status: "invalid"; errors: string[] };

export function inspectGodscarPocket(arc: Arc): GodscarPocketInspection {
  if (arc.extensions?.[GODSCAR_EXTENSION_KEY] === undefined) return { status: "none" };
  try {
    const source = readGodscarPocketExtension(arc);
    return source ? { status: "valid", source } : { status: "none" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errors = message.split("\n").filter((line) => line && line !== "Invalid Godscar pocket:");
    return { status: "invalid", errors: errors.length > 0 ? errors : [message] };
  }
}
