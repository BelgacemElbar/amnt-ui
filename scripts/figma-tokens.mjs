/**
 * Ink tokens → Figma variables, in the W3C design-token format (DTCG) that
 * Figma's variable import and Tokens Studio both read.
 *
 *   node scripts/figma-tokens.mjs
 *
 * Writes figma/light.tokens.json and figma/dark.tokens.json (the colour roles,
 * one file per mode) and figma/base.tokens.json (spacing, corners, type).
 */
import { readFileSync, writeFileSync } from "node:fs";

const t = JSON.parse(readFileSync("ui/tokens/tokens.generated.json", "utf8"));
const px = (v) => (String(v).endsWith("rem") ? parseFloat(v) * 16 : parseFloat(v));

const colours = (mode) => ({
    color: Object.fromEntries(Object.entries(t.color[mode]).map(([k, v]) => [k, { $type: "color", $value: v }])),
});

const base = {
    space: Object.fromEntries(Object.entries(t.space).map(([k, v]) => [k, { $type: "number", $value: px(v) }])),
    radius: Object.fromEntries(Object.entries(t.shape).map(([k, v]) => [k, { $type: "number", $value: Math.min(px(v), 9999) }])),
    type: Object.fromEntries(
        Object.entries(t.typescale).map(([k, v]) => [
            k,
            {
                size: { $type: "number", $value: px(v.size) },
                line: { $type: "number", $value: px(v.line) },
                weight: { $type: "number", $value: Number(v.weight) },
                tracking: { $type: "string", $value: v.tracking },
            },
        ]),
    ),
    font: { body: { $type: "string", $value: "Martian Mono" }, mono: { $type: "string", $value: "Martian Mono" } },
};

writeFileSync("figma/light.tokens.json", JSON.stringify(colours("light"), null, 2) + "\n");
writeFileSync("figma/dark.tokens.json", JSON.stringify(colours("dark"), null, 2) + "\n");
writeFileSync("figma/base.tokens.json", JSON.stringify(base, null, 2) + "\n");
console.log(`✅ figma/: ${Object.keys(t.color.light).length} colours × 2 modes, ${Object.keys(t.space).length} spaces, ${Object.keys(t.typescale).length} type styles`);
