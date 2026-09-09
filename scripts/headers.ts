import { existsSync, writeFileSync } from "node:fs";
import { syncBody } from "./csp";
import { fingerprints, pages, read } from "./html";

const dist = "dist";
const source = "public/_headers";
const mirror = "dist/_headers";

if (!existsSync(dist))
	throw new Error(`missing ${dist}/, run "astro build" first`);
const body = read(source);
if (!body.includes("script-src"))
	throw new Error(`script-src not found in ${source}`);
const hashes = fingerprints(pages(dist));
const next = syncBody(body, hashes);
const changed = [source, mirror].filter(
	(path) => !existsSync(path) || read(path) !== next,
);
for (const path of changed) writeFileSync(path, next);
const count = hashes.length;
console.log(
	changed.length > 0
		? `updated with ${count} inline hash${count === 1 ? "" : "es"}`
		: "already in sync",
);
