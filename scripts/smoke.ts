import {
	assetRefs,
	fingerprint,
	fingerprints,
	inlineScripts,
	pages,
	read,
} from "./html";
import { directive, hashes, policy } from "./csp";
import { existsSync } from "node:fs";
import nodePath from "node:path";

const dist = "dist";
const source = "public/_headers";
const mirror = "dist/_headers";
const TIMEOUT_MS = 20_000;
const OK = 200;
const ARGV_SCRIPT_OFFSET = 2;

const checkDist = (): readonly string[] => {
	if (!existsSync(dist)) {
		return [`missing ${dist}/, run "astro build" first`];
	}
	const site = pages(dist);
	const sourceText = read(source);
	const scriptSrc = directive(sourceText, "script-src");
	const allowlisted = new Set(hashes(scriptSrc));
	return [
		...site.flatMap((page) =>
			assetRefs(page.html)
				.filter(
					(ref) => ref.startsWith("/") && !existsSync(nodePath.join(dist, ref)),
				)
				.map((ref) => `${page.path} references missing ${ref}`),
		),
		...fingerprints(site)
			.filter((hash) => !allowlisted.has(hash))
			.map((hash) => `${hash} from dist inline script missing in ${source}`),
		...(existsSync(mirror) && read(mirror) === sourceText
			? []
			: [`${mirror} out of sync, run "jiti ./scripts/headers.ts"`]),
	];
};

const get = (url: string): Promise<Response> =>
	fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

const status = async (url: string): Promise<number | null> => {
	try {
		const response = await get(url);
		await response.arrayBuffer();
		return response.status;
	} catch {
		return null;
	}
};

const checkRef = async (
	ref: string,
	pageUrl: string,
	origin: string,
): Promise<string | undefined> => {
	let target: URL;
	try {
		target = new URL(ref, pageUrl);
	} catch {
		return undefined;
	}
	if (target.origin !== origin) {
		return undefined;
	}
	const code = await status(target.href);
	return code === OK
		? undefined
		: `GET ${target.href} -> ${code ?? "failed"} (referenced by ${pageUrl})`;
};

const checkRefs = async (
	html: string,
	pageUrl: string,
	origin: string,
): Promise<readonly string[]> => {
	const failures: string[] = [];
	for (const ref of assetRefs(html)) {
		// Serial on purpose: the live checker hammers one origin, and mirrors real page loads.
		// eslint-disable-next-line no-await-in-loop
		const failure = await checkRef(ref, pageUrl, origin);
		if (failure) {
			failures.push(failure);
		}
	}
	return failures;
};

const checkInline = (
	html: string,
	csp: string | null,
	pageUrl: string,
): readonly string[] => {
	const rules = policy(csp);
	if (!rules || rules.unsafeInline) {
		return [];
	}
	return inlineScripts(html)
		.filter((script) => !rules.hashes.includes(fingerprint(script)))
		.map(() => `inline script on ${pageUrl} missing from script-src`);
};

const checkPage = async (url: string): Promise<readonly string[]> => {
	let response: Response;
	try {
		response = await get(url);
	} catch {
		return [`GET ${url} failed`];
	}
	if (response.status !== OK) {
		return [`GET ${url} -> ${response.status}`];
	}
	const html = await response.text();
	const { origin } = new URL(url);
	const csp = response.headers.get("content-security-policy");
	return [
		...(await checkRefs(html, url, origin)),
		...checkInline(html, csp, url),
	];
};

const checkLive = async (
	urls: readonly string[],
): Promise<readonly string[]> => {
	const results = await Promise.all(urls.map((url) => checkPage(url)));
	return results.flat();
};

const main = async (): Promise<void> => {
	const args = process.argv.slice(ARGV_SCRIPT_OFFSET);
	const failures = args.length === 0 ? checkDist() : await checkLive(args);
	if (failures.length > 0) {
		for (const failure of failures) {
			console.error(`smoke: ${failure}`);
		}
		process.exitCode = 1;
	} else {
		process.stdout.write(
			`smoke: ok (${args.length === 0 ? dist : args.join(", ")})\n`,
		);
	}
};

await main();
