#!/usr/bin/env node
/**
 * Regenerate the API types from the self-service OpenAPI document.
 *
 * The web portal and the mobile app are built and deployed on different
 * platforms, so they cannot share a source package. They share this spec
 * instead: each app generates its own copy of the types, and each deploy is
 * self-contained.
 *
 *   npm run api:sync              # from the checked-in spec
 *   API_SPEC=/path/to/spec.json npm run api:sync
 *
 * Run this after changing the backend, then commit the regenerated spec and
 * schema.d.ts together so the change is visible in review.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

const source = process.env.API_SPEC ?? resolve(projectRoot, "../openapi/self-service.openapi.json");
const specTarget = resolve(projectRoot, "src/api/self-service.openapi.json");
const schemaTarget = resolve(projectRoot, "src/api/schema.d.ts");

if (!existsSync(source)) {
  console.error(`OpenAPI document not found: ${source}`);
  console.error("Generate it with: cd loan-management-api && php artisan l5-swagger:generate");
  console.error("then: python3 openapi/extract_self_service.py");
  process.exit(1);
}

mkdirSync(dirname(specTarget), { recursive: true });
copyFileSync(source, specTarget);
console.log(`Copied spec from ${source}`);

execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  // Run through npx: the generator peers on TypeScript 5 while Expo pins v6, and
  // the generated file is committed so builds never need the generator.
  ["--yes", "openapi-typescript@7", specTarget, "-o", schemaTarget],
  { stdio: "inherit", cwd: projectRoot },
);

console.log(`Wrote ${schemaTarget}`);
