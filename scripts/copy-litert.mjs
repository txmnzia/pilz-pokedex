// Copies the LiteRT.js wasm runtime (non-threaded, with and without relaxed SIMD) into public/litert/.
// Not committed (22 MB); runs before dev and build.
import { cp, mkdir } from "node:fs/promises";
const src = "node_modules/@litertjs/core/wasm/";
await mkdir("public/litert", { recursive: true });
for (const f of ["litert_wasm_internal", "litert_wasm_compat_internal"])
  for (const ext of [".js", ".wasm"]) await cp(src + f + ext, `public/litert/${f}${ext}`);
