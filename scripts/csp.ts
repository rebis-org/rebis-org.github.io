export const directive = (csp: string, name: string): string =>
	csp.match(new RegExp(`(?:^|;)\\s*${name}([^;]*);?`))?.[1] ?? "";

const tokens = (value: string): readonly string[] =>
	value.split(/\s+/).filter((token) => token);

export const hashes = (value: string): readonly string[] =>
	tokens(value).filter((token) => token.startsWith("'sha256-"));

const withHashes = (line: string, fingerprints: readonly string[]): string => {
	const current = directive(line, "script-src");
	const kept = tokens(current).filter((token) => !token.includes("sha256-"));
	return line.replace(
		`script-src${current};`,
		`script-src ${[...kept, ...fingerprints].join(" ")};`,
	);
};

export const syncBody = (
	body: string,
	fingerprints: readonly string[],
): string =>
	body
		.split("\n")
		.map((line) =>
			line.includes("script-src") ? withHashes(line, fingerprints) : line,
		)
		.join("\n");

type Policy = {
	readonly unsafeInline: boolean;
	readonly hashes: readonly string[];
};

export const policy = (csp: string | null): Policy | null => {
	if (!csp) return null;
	const list = tokens(
		directive(csp, "script-src") || directive(csp, "default-src"),
	);
	if (list.length === 0) return null;
	const ignored = list.some(
		(token) => token.startsWith("'sha256-") || token.startsWith("'nonce-"),
	);
	return {
		unsafeInline: list.includes("'unsafe-inline'") && !ignored,
		hashes: list.filter((token) => token.startsWith("'sha256-")),
	};
};
