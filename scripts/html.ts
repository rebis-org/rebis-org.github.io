import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import nodePath from "node:path";

export interface Page {
	readonly path: string;
	readonly html: string;
}

export const read = (path: string): string => readFileSync(path, "utf8");

const htmlPaths = (dir: string): readonly string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isDirectory()) {
			return htmlPaths(nodePath.join(dir, entry.name));
		}
		return entry.name.endsWith(".html") ? [nodePath.join(dir, entry.name)] : [];
	});

export const pages = (dir: string): readonly Page[] =>
	htmlPaths(dir).map((path) => ({ path, html: read(path) }));

export const inlineScripts = (html: string): readonly string[] =>
	[
		...html.matchAll(
			/<script(?![^>]*\ssrc=)[^>]*>(?<content>[\s\S]*?)<\/script>/gu,
		),
	].flatMap((tag) => {
		const content = tag.groups?.content;
		return content?.trim() ? [content] : [];
	});

export const fingerprint = (content: string): string =>
	`'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;

export const fingerprints = (site: readonly Page[]): readonly string[] =>
	[
		...new Set(
			site.flatMap((page) =>
				inlineScripts(page.html).map((script) => fingerprint(script)),
			),
		),
	].toSorted();

export const assetRefs = (html: string): readonly string[] => {
	const refs: string[] = [];
	const push = (url: string | undefined): void => {
		if (!url) {
			return;
		}
		const [clean] = url.split(/[?#]/u);
		const trimmed = (clean ?? "").trim();
		if (trimmed) {
			refs.push(trimmed);
		}
	};
	for (const tag of html.matchAll(/<(?:script|img|link|source)\b[^>]*>/gu)) {
		for (const attr of tag[0].matchAll(/\s(?:src|href)="(?<url>[^"]*)"/gu)) {
			push(attr.groups?.url);
		}
	}
	for (const srcset of html.matchAll(/srcset="(?<candidates>[^"]*)"/gu)) {
		for (const part of (srcset.groups?.candidates ?? "").split(",")) {
			push(part.trim().split(/\s+/u)[0]);
		}
	}
	return [...new Set(refs)].toSorted();
};
