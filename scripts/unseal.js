/* Inline browser payload: copied into sealed pages by scripts/seal.ts. */
const MAGIC_LENGTH = 4;
const HEADER_OFFSET = 8;
const KEY_BITS = 256;
const MANIFEST_LENGTH_BYTES = 4;
const decoder = new TextDecoder();
const form = document.querySelector("#sealed-form");
const article = document.querySelector("#sealed");
const input = document.querySelector("#sealed-password");
const failure = document.querySelector("#sealed-error");

const decode64 = (value) =>
	Uint8Array.from(atob(value), (character) => character.codePointAt(0));

const readPayload = async () => {
	const response = await fetch("__SEAL_PAYLOAD__");
	return new Uint8Array(await response.arrayBuffer());
};

const splitHeader = (payload) => {
	const headerLength = new DataView(payload.buffer).getUint32(MAGIC_LENGTH);
	const header = JSON.parse(
		decoder.decode(
			payload.subarray(HEADER_OFFSET, HEADER_OFFSET + headerLength),
		),
	);
	return { header, body: payload.subarray(HEADER_OFFSET + headerLength) };
};

const deriveKey = async (password, header) => {
	const material = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			hash: "SHA-256",
			iterations: header.iter,
			salt: decode64(header.salt),
		},
		material,
		KEY_BITS,
	);
	return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, [
		"decrypt",
	]);
};

const decryptBody = async (password, header, body) => {
	const key = await deriveKey(password, header);
	const aad = new TextEncoder().encode(`__SEAL_AAD_PREFIX__${header.route}`);
	return crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: decode64(header.iv), additionalData: aad },
		key,
		body,
	);
};

const unpackHtml = (plain) => {
	const bytes = new Uint8Array(plain);
	const manifestLength = new DataView(bytes.buffer).getUint32(0);
	const manifest = JSON.parse(
		decoder.decode(
			bytes.subarray(
				MANIFEST_LENGTH_BYTES,
				MANIFEST_LENGTH_BYTES + manifestLength,
			),
		),
	);
	const base = MANIFEST_LENGTH_BYTES + manifestLength;
	const start = base + manifest.html.offset;
	let html = decoder.decode(
		bytes.subarray(start, start + manifest.html.length),
	);
	for (const file of manifest.files) {
		const offset = base + file.offset;
		const blob = new Blob([bytes.subarray(offset, offset + file.length)], {
			type: file.mime,
		});
		html = html.split(file.url).join(URL.createObjectURL(blob));
	}
	return html;
};

const reveal = async () => {
	const { header, body } = splitHeader(await readPayload());
	if (header.route !== form.dataset.route) {
		throw new Error("route mismatch");
	}
	const plain = await decryptBody(input.value, header, body);
	article.outerHTML = unpackHtml(plain);
	document.dispatchEvent(new CustomEvent("rebis:unsealed"));
};

form.addEventListener("submit", (event) => {
	event.preventDefault();
	failure.hidden = true;
	reveal().catch(() => {
		failure.hidden = false;
	});
});
