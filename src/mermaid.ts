import type { Mermaid } from "mermaid";

type RGB = readonly [number, number, number];

const HEX_BASE = 16;
const BYTE_LENGTH = 2;
const DEBOUNCE_MS = 50;
const ROOT_MARGIN_PX = 300;

const WEIGHT = {
	deep: 0.85,
	dim: 0.75,
	strong: 0.8,
	light: 0.65,
	soft: 0.7,
	mid: 0.6,
	low: 0.55,
	half: 0.5,
	faint: 0.4,
	pale: 0.35,
	trace: 0.2,
	gridline: 0.18,
	ghost: 0.16,
	wash: 0.1,
	mist: 0.08,
} as const;

const theme = (): readonly [RGB, RGB, RGB] => {
	const probe = document.createElement("div");
	document.body.append(probe);
	probe.style.position = "fixed";
	probe.style.left = "-9999px";
	const read = (name: string): RGB => {
		probe.style.color = `var(${name})`;
		const style = getComputedStyle(probe);
		const [r = "0", g = "0", b = "0"] = style.color.match(/\d+/gu) ?? [];
		return [Number(r), Number(g), Number(b)];
	};
	const colors = [
		read("--ink"),
		read("--muted"),
		read("--background"),
	] as const;
	probe.remove();
	return colors;
};

const hex = ([r, g, b]: RGB): string => {
	const channels = [r, g, b].map((channel) =>
		channel.toString(HEX_BASE).padStart(BYTE_LENGTH, "0"),
	);
	return `#${channels.join("")}`;
};

const shade = ([fr, fg, fb]: RGB, [tr, tg, tb]: RGB, weight: number): RGB => [
	Math.round(fr * weight + tr * (1 - weight)),
	Math.round(fg * weight + tg * (1 - weight)),
	Math.round(fb * weight + tb * (1 - weight)),
];

const FONT = "var(--font-noto-sans), var(--font-noto-sans-sc), sans-serif";

const TEXT_KEYS = [
	"textColor",
	"titleColor",
	"primaryTextColor",
	"edgeLabelColor",
	"actorTextColor",
	"signalColor",
	"signalTextColor",
	"labelTextColor",
	"noteTextColor",
	"sequenceNumberColor",
	"classText",
	"taskTextColor",
	"commitLabelColor",
	"tagLabelColor",
] as const;

const LINE_KEYS = [
	"lineColor",
	"primaryBorderColor",
	"nodeBorder",
	"clusterBorder",
	"actorBorder",
	"actorLineColor",
	"labelBoxBorderColor",
	"noteBorderColor",
	"activationBorderColor",
	"taskBorderColor",
	"todayLineColor",
	"tagLabelBorder",
] as const;

const BKG_KEYS = [
	"primaryColor",
	"mainBkg",
	"nodeBkg",
	"edgeLabelBackground",
	"actorBkg",
	"labelBoxBkgColor",
	"attributeBackgroundColorOdd",
	"taskBkgColor",
	"commitLabelBackground",
	"tagLabelBackground",
] as const;

const SOFT_BKG_KEYS = [
	"clusterBkg",
	"noteBkgColor",
	"activationBkgColor",
	"attributeBackgroundColorEven",
	"sectionBkgColor",
] as const;

const fill = (keys: readonly string[], value: string): Record<string, string> =>
	Object.fromEntries(keys.map((key) => [key, value]));

const palette = ([ink, muted, bg]: readonly [RGB, RGB, RGB]): Record<
	string,
	string
> => {
	const toHex = (color: RGB): string => hex(color);
	const mutedHex = toHex(muted);
	const inkHex = toHex(ink);
	const bgHex = toHex(bg);
	const bgMix = (weight: number): string => toHex(shade(muted, bg, weight));
	const inkMix = (weight: number): string => toHex(shade(muted, ink, weight));
	const pie = [
		bgMix(WEIGHT.dim),
		bgMix(WEIGHT.low),
		bgMix(WEIGHT.pale),
		mutedHex,
		inkMix(WEIGHT.strong),
		inkMix(WEIGHT.light),
		inkMix(WEIGHT.faint),
		inkHex,
	];
	const git = [
		mutedHex,
		inkMix(WEIGHT.half),
		bgMix(WEIGHT.soft),
		inkMix(WEIGHT.mid),
		bgMix(WEIGHT.faint),
		bgMix(WEIGHT.half),
		inkMix(WEIGHT.soft),
		inkMix(WEIGHT.deep),
	];
	return {
		...fill(TEXT_KEYS, inkHex),
		...fill(LINE_KEYS, mutedHex),
		...fill(BKG_KEYS, bgHex),
		...fill(SOFT_BKG_KEYS, bgMix(WEIGHT.mist)),
		secondaryColor: bgMix(WEIGHT.wash),
		tertiaryColor: bgMix(WEIGHT.trace),
		sectionBkgColor2: bgMix(WEIGHT.ghost),
		gridColor: bgMix(WEIGHT.gridline),
		fontFamily: FONT,
		fontSize: "14px",
		tagLabelFontSize: "12px",
		...Object.fromEntries(
			pie.map((color, index) => [`pie${index + 1}`, color]),
		),
		...Object.fromEntries(git.map((color, index) => [`git${index}`, color])),
	};
};

const themeKey = (colors: readonly RGB[]): string =>
	colors.map((color) => hex(color)).join(",");

let instance: Mermaid | undefined;
let currentKey = "";

const applyTheme = (colors: readonly [RGB, RGB, RGB]): void => {
	const key = themeKey(colors);
	if (key === currentKey) {
		return;
	}
	instance?.initialize({
		startOnLoad: false,
		securityLevel: "strict",
		theme:
			document.documentElement.dataset.theme === "dark" ? "dark" : "default",
		themeVariables: { background: "transparent", ...palette(colors) },
		gitGraph: {
			mainBranchName: "main",
			showCommitLabel: true,
			showBranches: true,
			rotateCommitLabel: true,
		},
	});
	currentKey = key;
};

const ready = async (): Promise<Mermaid> => {
	if (!instance) {
		const module = await import("mermaid");
		instance = module.default;
	}
	applyTheme(theme());
	return instance;
};

const source = (pre: HTMLPreElement): string =>
	(pre.dataset.diagram ??= (pre.textContent ?? "").replace(/\n$/u, ""));

const fail = (pre: HTMLPreElement, message: string): void => {
	const box = document.createElement("div");
	box.className = "mermaid-error";
	const detail = document.createElement("p");
	detail.textContent = `Error rendering diagram: ${message}`;
	const src = document.createElement("pre");
	src.textContent = source(pre);
	box.append(detail, src);
	pre.replaceChildren(box);
};

const size = (pre: HTMLPreElement, svgEl: SVGElement): void => {
	const { width } = pre.dataset;
	const { height } = pre.dataset;
	if (width) {
		svgEl.style.width = `${width}px`;
	}
	if (height) {
		svgEl.style.height = `${height}px`;
	}
};

const mount = (
	pre: HTMLPreElement,
	svg: string,
	bindFunctions: ((element: Element) => void) | undefined,
): void => {
	pre.replaceChildren();
	pre.innerHTML = svg;
	const svgEl = pre.querySelector("svg");
	if (!svgEl) {
		return;
	}
	bindFunctions?.(svgEl);
	size(pre, svgEl);
};

const onError = (pre: HTMLPreElement, error: unknown): void => {
	console.error("[mermaid] render error:", error);
	fail(pre, error instanceof Error ? error.message : String(error));
	pre.dataset.processed = "true";
};

const render = async (pre: HTMLPreElement, force = false): Promise<void> => {
	if (
		pre.dataset.rendering === "true" ||
		(!force && pre.dataset.processed === "true")
	) {
		return;
	}
	pre.dataset.rendering = "true";
	try {
		const mermaid = await ready();
		const { svg, bindFunctions } = await mermaid.render(
			crypto.randomUUID(),
			source(pre),
		);
		mount(pre, svg, bindFunctions);
		pre.dataset.processed = "true";
	} catch (error) {
		onError(pre, error);
	} finally {
		delete pre.dataset.rendering;
	}
};

const watch = (pres: readonly HTMLPreElement[]): void => {
	const pending = new Set(pres);
	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const pre = entry.target as HTMLPreElement;
				if (!entry.isIntersecting || !pending.delete(pre)) {
					continue;
				}
				io.unobserve(pre);
				void render(pre);
			}
			if (pending.size === 0) {
				io.disconnect();
			}
		},
		{ rootMargin: `${ROOT_MARGIN_PX}px` },
	);
	for (const pre of pres) {
		io.observe(pre);
	}
};

export const observeMermaid = (root: ParentNode = document): void => {
	const pres = [...root.querySelectorAll<HTMLPreElement>("pre.mermaid")].filter(
		(pre) => pre.dataset.processed !== "true",
	);
	if (pres.length === 0) {
		return;
	}
	if (!("IntersectionObserver" in globalThis)) {
		void Promise.all(pres.map((pre) => render(pre)));
		return;
	}
	watch(pres);
};

let observer: MutationObserver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

const refresh = (): void => {
	if (themeKey(theme()) === currentKey) {
		return;
	}
	for (const pre of document.querySelectorAll<HTMLPreElement>(
		"pre.mermaid[data-processed]",
	)) {
		void render(pre, true);
	}
	observeMermaid();
};

export const observeTheme = (): void => {
	if (observer) {
		return;
	}
	observer = new MutationObserver(() => {
		clearTimeout(timer);
		timer = setTimeout(refresh, DEBOUNCE_MS);
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["data-theme"],
	});
};
