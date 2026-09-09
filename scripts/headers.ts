import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
const source = "public/_headers";
const mirror = "dist/_headers";
const pattern = /script-src([^;]*);/;

const read = (file: string): string => readFileSync(file, "utf8");

const htmlFiles = (dir: string): readonly string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? htmlFiles(join(dir, entry.name))
			: entry.name.endsWith(".html")
				? [join(dir, entry.name)]
				: [],
	);

const inlineScripts = (html: string): readonly string[] =>
	[
		...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g),
	].flatMap((tag) => {
		const content = tag[1];
		return content?.trim() ? [content] : [];
	});

const fingerprint = (content: string): string =>
	`'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;

const sources = (line: string): readonly string[] =>
	(line.match(pattern)?.[1] ?? "")
		.split(/\s+/)
		.filter((token) => token && !token.includes("sha256-"));

const refresh = (line: string, hashes: readonly string[]): string =>
	line.replace(
		pattern,
		`script-src ${[...sources(line), ...hashes].join(" ")};`,
	);

if (!existsSync(dist))
	throw new Error(`missing ${dist}/, run "astro build" first`);
const hashes = [
	...new Set(
		htmlFiles(dist).flatMap((file) =>
			inlineScripts(read(file)).map(fingerprint),
		),
	),
].sort();
const lines = read(source).split("\n");
const index = lines.findIndex((line) => line.includes("script-src"));
if (index === -1) throw new Error(`script-src not found in ${source}`);
lines[index] = refresh(lines[index] ?? "", hashes);
const body = lines.join("\n");
const changed = [source, mirror].filter(
	(file) => !existsSync(file) || read(file) !== body,
);
for (const file of changed) writeFileSync(file, body);
console.log(
	changed.length > 0
		? `updated with ${hashes.length} inline hash(es)`
		: "already in sync",
);
