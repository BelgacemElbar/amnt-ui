// Self-check: run amnt on two fake projects (Tailwind 4 with src/, Tailwind 3
// without), no network, no installs. `node cli/test.mjs`
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const cli = new URL("amnt.mjs", import.meta.url).pathname;
const ink = new URL("../public/r/ink.json", import.meta.url).pathname;
const run = (dir, ...a) => execFileSync("node", [cli, ...a, "--from", ink, "--no-install"], { cwd: dir, encoding: "utf8" });
const project = (files) => {
    const dir = mkdtempSync(join(tmpdir(), "amnt-"));
    for (const [p, t] of Object.entries(files)) { mkdirSync(join(dir, p, ".."), { recursive: true }); writeFileSync(join(dir, p), t); }
    return dir;
};
const r = (dir, p) => readFileSync(join(dir, p), "utf8");

// 1. Tailwind 4, src/, no config: one part, then another, then everything.
const a = project({
    "package.json": JSON.stringify({ dependencies: { next: "15" }, devDependencies: { tailwindcss: "^4", clsx: "2" } }),
    "tsconfig.json": `{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }`,
    "src/app/globals.css": `@import "tailwindcss";\n\nbody { font-family: Arial; }\n`,
});
const out = run(a, "add", "button");
assert.match(out, /Install: npm install tailwind-merge@1\.14\.0\n/, "clsx is already there, so only tailwind-merge");
assert.ok(existsSync(join(a, "src/ui/primitives/Button.tsx")));
assert.ok(!existsSync(join(a, "src/ui/components/DataTable.tsx")), "button alone must not pull the whole kit");
assert.match(r(a, "src/ui/index.ts"), /from "\.\/primitives\/Button"/);
assert.doesNotMatch(r(a, "src/ui/index.ts"), /DataTable/);
assert.doesNotMatch(r(a, "src/ui/primitives/Button.tsx"), /@\/ui/, "imports are made relative");
assert.match(r(a, "tailwind.config.mts"), /import ink from "\.\/src\/tailwind\.preset"/);
const css = r(a, "src/app/globals.css");
assert.ok(css.startsWith(`@import "../ui/tokens/tokens.css";\n@import "../ui/tokens/legacy.css";\n@import "../ui/ui.css";\n@import "tailwindcss";\n@config "../../tailwind.config.mts";`), css);
assert.match(css, /md-sys-color-surface-rgb/);

run(a, "add", "DateRangePicker");
assert.equal(r(a, "src/app/globals.css"), css, "second run leaves CSS alone");
assert.match(r(a, "src/ui/index.ts"), /DateRangePicker/);
assert.match(r(a, "src/ui/index.ts"), /Button/);

writeFileSync(join(a, "src/ui/primitives/Button.tsx"), "// mine\n");
assert.match(run(a, "add"), /Kept 1 files you changed/);
assert.equal(r(a, "src/ui/primitives/Button.tsx"), "// mine\n");
assert.ok(existsSync(join(a, "src/ui/components/DataTable.tsx")));
assert.equal(r(a, "src/ui/index.ts"), JSON.parse(readFileSync(ink, "utf8")).files.find((f) => f.path === "ui/index.ts").content);

// 2. Tailwind 3, no src/, create-next-app 14's config.
const b = project({
    "package.json": JSON.stringify({ dependencies: { next: "14" }, devDependencies: { tailwindcss: "^3.4.1" } }),
    "tsconfig.json": `{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }`,
    "app/globals.css": "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n",
    "tailwind.config.ts": `import type { Config } from "tailwindcss";\n\nconst config: Config = {\n  content: [\n    "./app/**/*.{js,ts,jsx,tsx,mdx}",\n  ],\n  plugins: [],\n};\nexport default config;\n`,
});
run(b, "add");
assert.ok(existsSync(join(b, "ui/index.ts")) && existsSync(join(b, "tailwind.preset.ts")));
assert.equal(r(b, "tailwind.config.ts"), `import ink from "./tailwind.preset";\nimport type { Config } from "tailwindcss";\n\nconst config: Config = {\n  presets: [ink],\n  content: [\n    "./ui/**/*.{ts,tsx}",\n    "./app/**/*.{js,ts,jsx,tsx,mdx}",\n  ],\n  plugins: [],\n};\nexport default config;\n`);
assert.ok(r(b, "app/globals.css").startsWith(`@import "../ui/tokens/tokens.css";`));
assert.doesNotMatch(r(b, "app/globals.css"), /@config/, "Tailwind 3 reads the config by itself");
assert.match(run(b, "add"), /already has the Ink preset/);

// 3. Unknown part → clear error.
assert.throws(() => run(b, "add", "nope"), /No part called nope/);

console.log("✓ amnt self-check passed");
