import {
	createCipheriv,
	createDecipheriv,
	pbkdf2Sync,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";
import {
	existsSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import nodePath from "node:path";

const MAGIC = "PLB1";
const VERSION = 1;
const KDF_NAME = "PBKDF2-SHA256";
const DIGEST = "sha256";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const U32_LENGTH = 4;
const PBKDF2_ITERATIONS = 310_000;
const AAD_PREFIX = "rebis-sealed:v1:";
const PAYLOAD_NAME = "protected-content.plb";
const EXPECTED_FILE_COUNT = 2;
const INDEX_NAME = "index.html";
const MARKER = 'data-sealed="true"';
const dist = "dist";

const ARTICLE_PATTERN =
	/<article\b[^>]*data-sealed="true"[^>]*>[\s\S]*?<\/article>/u;

interface SealedHeader {
	readonly version: number;
	readonly kdf: string;
	readonly iter: number;
	readonly salt: string;
	readonly iv: string;
	readonly route: string;
}

interface ManifestEntry {
	readonly offset: number;
	readonly length: number;
}

interface FileEntry extends ManifestEntry {
	readonly url: string;
	readonly mime: string;
}

interface SealedManifest {
	readonly html: ManifestEntry;
	readonly files: readonly FileEntry[];
}

interface PackedFile {
	readonly url: string;
	readonly mime: string;
	readonly fullPath: string;
	readonly data: Buffer;
}

interface SealedPage {
	readonly dir: string;
	readonly route: string;
	readonly html: string;
}

const passwordFor = (postId: string): string | undefined => {
	const map = process.env.SEAL_PASSWORDS;
	if (map !== undefined) {
		const parsed: unknown = JSON.parse(map);
		if (typeof parsed === "object" && parsed !== null && postId in parsed) {
			const value: unknown = (parsed as Record<string, unknown>)[postId];
			if (typeof value === "string" && value.length > 0) {
				return value;
			}
		}
	}
	const shared = process.env.SEAL_PASSWORD;
	return shared !== undefined && shared.length > 0 ? shared : undefined;
};

const mimeOf = (name: string): string => {
	const extension = nodePath.extname(name).toLowerCase();
	const table: Record<string, string> = {
		".webp": "image/webp",
		".png": "image/png",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".gif": "image/gif",
		".svg": "image/svg+xml",
		".pdf": "application/pdf",
		".txt": "text/plain",
		".mp4": "video/mp4",
		".webm": "video/webm",
		".woff2": "font/woff2",
	};
	return table[extension] ?? "application/octet-stream";
};

const deriveKey = (
	password: string,
	salt: Buffer,
	iterations: number,
): Buffer => pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST);

const frameHeader = (header: SealedHeader): Buffer => {
	const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
	const headerLength = Buffer.alloc(U32_LENGTH);
	headerLength.writeUInt32BE(headerBytes.length, 0);
	return Buffer.concat([Buffer.from(MAGIC, "utf8"), headerLength, headerBytes]);
};

const readHeader = (
	payload: Buffer,
): { readonly header: SealedHeader; readonly body: Buffer } => {
	if (payload.subarray(0, MAGIC.length).toString("utf8") !== MAGIC) {
		throw new Error("not a sealed payload");
	}
	const headerLength = payload.readUInt32BE(MAGIC.length);
	const headerStart = MAGIC.length + U32_LENGTH;
	const header = JSON.parse(
		payload.subarray(headerStart, headerStart + headerLength).toString("utf8"),
	) as SealedHeader;
	return { header, body: payload.subarray(headerStart + headerLength) };
};

const encryptPayload = (
	plaintext: Buffer,
	password: string,
	route: string,
): Buffer => {
	const salt = randomBytes(SALT_LENGTH);
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(
		"aes-256-gcm",
		deriveKey(password, salt, PBKDF2_ITERATIONS),
		iv,
	);
	cipher.setAAD(Buffer.from(`${AAD_PREFIX}${route}`, "utf8"));
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const header: SealedHeader = {
		version: VERSION,
		kdf: KDF_NAME,
		iter: PBKDF2_ITERATIONS,
		salt: salt.toString("base64"),
		iv: iv.toString("base64"),
		route,
	};
	return Buffer.concat([frameHeader(header), ciphertext, cipher.getAuthTag()]);
};

const decryptPayload = (payload: Buffer, password: string): Buffer => {
	const { header, body } = readHeader(payload);
	const key = deriveKey(
		password,
		Buffer.from(header.salt, "base64"),
		header.iter,
	);
	const decipher = createDecipheriv(
		"aes-256-gcm",
		key,
		Buffer.from(header.iv, "base64"),
	);
	decipher.setAAD(Buffer.from(`${AAD_PREFIX}${header.route}`, "utf8"));
	decipher.setAuthTag(body.subarray(body.length - TAG_LENGTH));
	return Buffer.concat([
		decipher.update(body.subarray(0, body.length - TAG_LENGTH)),
		decipher.final(),
	]);
};

const buildEntries = (
	files: readonly PackedFile[],
	start: number,
): readonly FileEntry[] => {
	const entries: FileEntry[] = [];
	let cursor = start;
	for (const file of files) {
		entries.push({
			url: file.url,
			mime: file.mime,
			offset: cursor,
			length: file.data.length,
		});
		cursor += file.data.length;
	}
	return entries;
};

const pack = (html: string, files: readonly PackedFile[]): Buffer => {
	const htmlBytes = Buffer.from(html, "utf8");
	const manifest: SealedManifest = {
		html: { offset: 0, length: htmlBytes.length },
		files: buildEntries(files, htmlBytes.length),
	};
	const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");
	const manifestLength = Buffer.alloc(U32_LENGTH);
	manifestLength.writeUInt32BE(manifestBytes.length, 0);
	return Buffer.concat([
		manifestLength,
		manifestBytes,
		htmlBytes,
		...files.map((file) => file.data),
	]);
};

const listFiles = (dir: string): readonly string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = nodePath.join(dir, entry.name);
		if (entry.isDirectory()) {
			return listFiles(full);
		}
		return [full];
	});

const collectFiles = (dir: string): readonly PackedFile[] =>
	listFiles(dir)
		.filter(
			(file) =>
				nodePath.basename(file) !== INDEX_NAME &&
				nodePath.basename(file) !== PAYLOAD_NAME,
		)
		.map((file) => ({
			url: nodePath.relative(dir, file).split(nodePath.sep).join("/"),
			mime: mimeOf(file),
			fullPath: file,
			data: readFileSync(file),
		}));

const findSealedPages = (root: string): readonly SealedPage[] =>
	listFiles(root)
		.filter(
			(file) =>
				nodePath.basename(file) === INDEX_NAME &&
				readFileSync(file, "utf8").includes(MARKER),
		)
		.map((file) => {
			const dir = nodePath.dirname(file);
			const relative = nodePath
				.relative(root, dir)
				.split(nodePath.sep)
				.join("/");
			return { dir, route: `/${relative}/`, html: readFileSync(file, "utf8") };
		});

const shellMarkup = (route: string): string =>
	`<article id="sealed" class="prose prose-p:text-secondary">
	<form id="sealed-form" data-route="${route}">
		<p>本文已加密，请输入密码访问。<br />This post is encrypted. Enter the password to continue.</p>
		<p>
			<label class="block">
				密码 Password
				<input
					id="sealed-password"
					class="mt-1 block w-full max-w-xs rounded border border-[var(--border)] bg-transparent px-2 py-1"
					type="password"
					name="password"
					autocomplete="current-password"
					required
				/>
			</label>
		</p>
		<p><button class="interactive-link font-medium" type="submit">解锁 Unlock</button></p>
		<p id="sealed-error" hidden>密码错误，请重试。 / Wrong password, try again.</p>
	</form>
</article>`;

const CLIENT_SOURCE = readFileSync(
	new URL("unseal.js", import.meta.url),
	"utf8",
);

const clientScript = (): string =>
	CLIENT_SOURCE.split("__SEAL_PAYLOAD__")
		.join(PAYLOAD_NAME)
		.split("__SEAL_AAD_PREFIX__")
		.join(AAD_PREFIX);

const extractArticle = (html: string): string => {
	const match = ARTICLE_PATTERN.exec(html);
	if (!match) {
		throw new Error("sealed marker found without an article body");
	}
	return match[0];
};

const postIdOf = (route: string): string => {
	const segments = route.split("/").filter(Boolean);
	return segments.at(-1) ?? "";
};

const requirePassword = (postId: string): string => {
	const password = passwordFor(postId);
	if (!password) {
		throw new Error(
			`no seal password configured for post "${postId}" ` +
				"(set SEAL_PASSWORDS or SEAL_PASSWORD)",
		);
	}
	return password;
};

const writeShell = (page: SealedPage): void => {
	const shell = page.html.replace(
		ARTICLE_PATTERN,
		() => `${shellMarkup(page.route)}\n<script>${clientScript()}</script>`,
	);
	writeFileSync(nodePath.join(page.dir, INDEX_NAME), shell);
};

const verifyDirectory = (dir: string): void => {
	const remaining = listFiles(dir).map((file) => nodePath.basename(file));
	if (
		remaining.length !== EXPECTED_FILE_COUNT ||
		!remaining.includes(INDEX_NAME) ||
		!remaining.includes(PAYLOAD_NAME)
	) {
		throw new Error(`unexpected files left in ${dir}: ${remaining.join(", ")}`);
	}
};

interface RoundTrip {
	readonly payload: Buffer;
	readonly password: string;
	readonly plaintext: Buffer;
	readonly route: string;
}

const verifyRoundTrip = (check: RoundTrip): void => {
	if (
		!timingSafeEqual(
			decryptPayload(check.payload, check.password),
			check.plaintext,
		)
	) {
		throw new Error(`sealed payload round-trip failed for ${check.route}`);
	}
};

const sealPage = (page: SealedPage): void => {
	const password = requirePassword(postIdOf(page.route));
	const files = collectFiles(page.dir);
	const plaintext = pack(extractArticle(page.html), files);
	const payload = encryptPayload(plaintext, password, page.route);
	verifyRoundTrip({ payload, password, plaintext, route: page.route });
	writeFileSync(nodePath.join(page.dir, PAYLOAD_NAME), payload);
	writeShell(page);
	for (const file of files) {
		rmSync(file.fullPath);
	}
	verifyDirectory(page.dir);
};

const stripSitemaps = (root: string, routes: readonly string[]): void => {
	for (const file of listFiles(root)) {
		if (!nodePath.basename(file).startsWith("sitemap")) {
			continue;
		}
		const xml = readFileSync(file, "utf8");
		const parts = xml.split("<url>");
		const kept = parts.filter(
			(part, index) =>
				index === 0 || !routes.some((route) => part.includes(route)),
		);
		if (kept.length !== parts.length) {
			writeFileSync(file, kept.join("<url>"));
		}
	}
};

const main = (): void => {
	if (!existsSync(dist)) {
		throw new Error(`missing ${dist}/, run "astro build" first`);
	}
	const pages = findSealedPages(dist);
	if (pages.length === 0) {
		process.stdout.write("seal: nothing to seal\n");
		return;
	}
	for (const page of pages) {
		sealPage(page);
	}
	stripSitemaps(
		dist,
		pages.map((page) => page.route),
	);
	process.stdout.write(`seal: sealed ${pages.length} page(s)\n`);
};

main();
