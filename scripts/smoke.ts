import { existsSync } from "node:fs";
import { join } from "node:path";
import { directive, hashes, policy } from "./csp";
import {
	assetRefs,
	fingerprint,
	fingerprints,
	inlineScripts,
	pages,
	read,
} from "./html";

const dist = "dist";
const source = "public/_headers";
const mirror = "dist/_headers";

const checkDist = (): readonly string[] => {
	if (!existsSync(dist)) return [`missing ${dist}/, run "astro build" first`];
	const site = pages(dist);
	const allowlisted = new Set(hashes(directive(read(source), "script-src")));
	return [
		...site.flatMap((page) =>
			assetRefs(page.html)
				.filter((ref) => ref.startsWith("/") && !existsSync(join(dist, ref)))
				.map((ref) => `${page.path} references missing ${ref}`),
		),
		...fingerprints(site)
			.filter((hash) => !allowlisted.has(hash))
			.map((hash) => `${hash} from dist inline script missing in ${source}`),
		...(existsSync(mirror) && read(mirror) === read(source)
			? []
			: [`${mirror} out of sync, run "jiti ./scripts/headers.ts"`]),
	];
};

const get = (url: string): Promise<Response> =>
	fetch(url, { signal: AbortSignal.timeout(20000) });

const status = async (url: string): Promise<number | null> => {
	try {
		const response = await get(url);
		await response.arrayBuffer();
		return response.status;
	} catch {
		return null;
	}
};

const checkPage = async (url: string): Promise<readonly string[]> => {
	let response: Response;
	try {
		response = await get(url);
	} catch {
		return [`GET ${url} failed`];
	}
	if (response.status !== 200) return [`GET ${url} -> ${response.status}`];
	const html = await response.text();
	const origin = new URL(url).origin;
	const failures: string[] = [];
	for (const ref of assetRefs(html)) {
		let target: URL;
		try {
			target = new URL(ref, url);
		} catch {
			continue;
		}
		if (target.origin !== origin) continue;
		const code = await status(target.href);
		if (code !== 200)
			failures.push(
				`GET ${target.href} -> ${code ?? "failed"} (referenced by ${url})`,
			);
	}
	const rules = policy(response.headers.get("content-security-policy"));
	if (rules && !rules.unsafeInline)
		for (const script of inlineScripts(html))
			if (!rules.hashes.includes(fingerprint(script)))
				failures.push(`inline script on ${url} missing from script-src`);
	return failures;
};

const checkLive = async (urls: readonly string[]): Promise<readonly string[]> =>
	(await Promise.all(urls.map(checkPage))).flat();

const main = async (): Promise<void> => {
	const args = process.argv.slice(2);
	const failures = args.length === 0 ? checkDist() : await checkLive(args);
	if (failures.length > 0) {
		for (const failure of failures) console.error(`smoke: ${failure}`);
		process.exitCode = 1;
	} else {
		console.log(`smoke: ok (${args.length === 0 ? dist : args.join(", ")})`);
	}
};

void main();
