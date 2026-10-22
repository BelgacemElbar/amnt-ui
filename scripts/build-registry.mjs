/**
 * Build the install file any agent or person can use in one command:
 *
 *   npx shadcn@latest add https://raw.githubusercontent.com/BelgacemElbar/amnt-ui/main/public/r/ink.json
 *
 * It follows the shadcn registry format (ui.shadcn.com/schema/registry-item.json),
 * so Claude Code, Cursor, v0 and the shadcn CLI all understand it. Every file
 * lands in src/ui, plus the Tailwind preset at the project root.
 *
 *   node scripts/build-registry.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
});

const files = walk("ui")
    .filter((p) => /\.(tsx?|css|json)$/.test(p))
    .sort()
    .map((path) => ({ path, type: "registry:file", target: `src/${path}`, content: readFileSync(path, "utf8") }));
files.push({ path: "tailwind.preset.ts", type: "registry:file", target: "tailwind.preset.ts", content: readFileSync("tailwind.preset.ts", "utf8") });

const item = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "ink",
    type: "registry:block",
    title: "AMNT UI (Ink)",
    description: "The whole Ink design system: 50+ components, tokens, 339 icons, app shells. Next.js + Tailwind 3.",
    dependencies: ["clsx@2.1.1", "tailwind-merge@1.14.0"],
    devDependencies: ["tailwindcss-animate@1.0.7", "@tailwindcss/typography@0.5.20"],
    docs: "Next: add `presets: [require('./tailwind.preset')]` (or import it) to tailwind.config, import 'src/ui/tokens/tokens.css', 'src/ui/tokens/legacy.css' and 'src/ui/ui.css' at the top of globals.css, and make sure tsconfig has \"@/*\": [\"./src/*\"]. Then: import { Button } from \"@/ui\".",
    files,
};
writeFileSync("public/r/ink.json", JSON.stringify(item) + "\n");
writeFileSync(
    "public/r/registry.json",
    JSON.stringify({ $schema: "https://ui.shadcn.com/schema/registry.json", name: "amnt-ui", homepage: "https://github.com/BelgacemElbar/amnt-ui", items: [{ name: item.name, type: item.type, title: item.title, description: item.description }] }, null, 2) + "\n",
);
console.log(`✅ public/r/ink.json: ${files.length} files, ${(JSON.stringify(item).length / 1024).toFixed(0)} KB`);
