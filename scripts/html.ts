import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Page = { readonly path: string; readonly html: string };

export const read = (path: string): string => readFileSync(path, "utf8");

const htmlPaths = (dir: string): readonly string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? htmlPaths(join(dir, entry.name))
			: entry.name.endsWith(".html")
				? [join(dir, entry.name)]
				: [],
	);

export const pages = (dir: string): readonly Page[] =>
	htmlPaths(dir).map((path) => ({ path, html: read(path) }));

export const inlineScripts = (html: string): readonly string[] =>
	[
		...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g),
	].flatMap((tag) => {
		const content = tag[1];
		return content?.trim() ? [content] : [];
	});

export const fingerprint = (content: string): string =>
	`'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;

export const fingerprints = (site: readonly Page[]): readonly string[] =>
	[
		...new Set(
			site.flatMap((page) => inlineScripts(page.html).map(fingerprint)),
		),
	].sort();

export const assetRefs = (html: string): readonly string[] => {
	const refs: string[] = [];
	const push = (url: string | undefined): void => {
		if (!url) return;
		const clean = (url.split(/[?#]/)[0] ?? "").trim();
		if (clean) refs.push(clean);
	};
	for (const tag of html.matchAll(/<(?:script|img|link|source)\b[^>]*>/g))
		for (const attr of tag[0].matchAll(/\s(?:src|href)="([^"]*)"/g))
			push(attr[1]);
	for (const srcset of html.matchAll(/srcset="([^"]*)"/g))
		for (const part of (srcset[1] ?? "").split(","))
			push(part.trim().split(/\s+/)[0]);
	return [...new Set(refs)].sort();
};
