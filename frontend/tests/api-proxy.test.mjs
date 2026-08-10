import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("browser API calls default to the same-origin Next proxy", () => {
  const apiSource = readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8");
  const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

  assert.match(apiSource, /NEXT_PUBLIC_API_BASE\s*\?\?\s*["']{2}/);
  assert.doesNotMatch(apiSource, /NEXT_PUBLIC_API_BASE\s*\?\?\s*["']http:\/\/localhost:8000/);
  assert.match(nextConfig, /source:\s*["']\/api\/:path\*["']/);
  assert.match(nextConfig, /destination:\s*`\$\{backend\}\/api\/:path\*`/);
  assert.match(nextConfig, /BACKEND_INTERNAL_URL/);
});
