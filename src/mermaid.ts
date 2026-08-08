type MermaidModule = typeof import("mermaid");
type Mermaid = MermaidModule["default"];
type RGB = readonly [number, number, number];

const theme = (): readonly [RGB, RGB, RGB] => {
	const probe = document.body.appendChild(document.createElement("div"));
	probe.style.position = "fixed";
	probe.style.left = "-9999px";
	const read = (name: string): RGB => {
		probe.style.color = `var(${name})`;
		const [r = 0, g = 0, b = 0] =
			getComputedStyle(probe).color.match(/\d+/g)?.map(Number) ?? [];
		return [r, g, b];
	};
	const colors = [
		read("--ink"),
		read("--muted"),
		read("--background"),
	] as const;
	probe.remove();
	return colors;
};

const hex = ([r, g, b]: RGB): string =>
	`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

const shade = ([fr, fg, fb]: RGB, [tr, tg, tb]: RGB, weight: number): RGB => [
	Math.round(fr * weight + tr * (1 - weight)),
	Math.round(fg * weight + tg * (1 - weight)),
	Math.round(fb * weight + tb * (1 - weight)),
];

const FONT = "var(--font-noto-sans), var(--font-noto-sans-sc), sans-serif";

const palette = ([ink, muted, bg]: readonly [RGB, RGB, RGB]): Record<
	string,
	string
> => {
	const h = (c: RGB): string => hex(c);
	const m = h(muted);
	const i = h(ink);
	const b = h(bg);
	const bgMix = (w: number): string => h(shade(muted, bg, w));
	const inkMix = (w: number): string => h(shade(muted, ink, w));
	const pie = [
		bgMix(0.75),
		bgMix(0.55),
		bgMix(0.35),
		m,
		inkMix(0.8),
		inkMix(0.65),
		inkMix(0.4),
		i,
	];
	const git = [
		m,
		inkMix(0.5),
		bgMix(0.7),
		inkMix(0.6),
		bgMix(0.4),
		bgMix(0.5),
		inkMix(0.7),
		inkMix(0.85),
	];
	return {
		lineColor: m,
		textColor: i,
		titleColor: i,
		primaryColor: b,
		primaryTextColor: i,
		primaryBorderColor: m,
		secondaryColor: bgMix(0.1),
		tertiaryColor: bgMix(0.2),
		mainBkg: b,
		nodeBkg: b,
		nodeBorder: m,
		clusterBkg: bgMix(0.08),
		clusterBorder: m,
		edgeLabelBackground: b,
		edgeLabelColor: i,
		fontFamily: FONT,
		fontSize: "14px",
		actorBkg: b,
		actorBorder: m,
		actorTextColor: i,
		actorLineColor: m,
		signalColor: i,
		signalTextColor: i,
		labelBoxBkgColor: b,
		labelBoxBorderColor: m,
		labelTextColor: i,
		noteBkgColor: bgMix(0.08),
		noteBorderColor: m,
		noteTextColor: i,
		activationBkgColor: bgMix(0.08),
		activationBorderColor: m,
		sequenceNumberColor: i,
		classText: i,
		attributeBackgroundColorOdd: b,
		attributeBackgroundColorEven: bgMix(0.08),
		sectionBkgColor: bgMix(0.08),
		sectionBkgColor2: bgMix(0.16),
		taskBkgColor: b,
		taskBorderColor: m,
		taskTextColor: i,
		gridColor: bgMix(0.18),
		todayLineColor: m,
		...Object.fromEntries(pie.map((v, k) => [`pie${k + 1}`, v])),
		...Object.fromEntries(git.map((v, k) => [`git${k}`, v])),
		commitLabelColor: i,
		commitLabelBackground: b,
		tagLabelColor: i,
		tagLabelBackground: b,
		tagLabelBorder: m,
		tagLabelFontSize: "12px",
	};
};

let instance: Mermaid | undefined;
let currentKey = "";

const ready = async (): Promise<Mermaid> => {
	instance ??= (await import("mermaid")).default;
	const colors = theme();
	const key = colors.map(hex).join(",");
	if (key !== currentKey) {
		instance.initialize({
			startOnLoad: false,
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
	}
	return instance;
};

const source = (pre: HTMLPreElement): string =>
	(pre.dataset.diagram ??= (pre.textContent ?? "").replace(/\n$/, ""));

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

const render = async (pre: HTMLPreElement, force = false): Promise<void> => {
	if (pre.dataset.rendering === "true") return;
	if (!force && pre.dataset.processed === "true") return;
	pre.dataset.rendering = "true";
	try {
		const { svg, bindFunctions } = await (await ready()).render(
			crypto.randomUUID(),
			source(pre),
		);
		pre.replaceChildren();
		pre.innerHTML = svg;
		const svgEl = pre.querySelector("svg");
		if (svgEl) {
			bindFunctions?.(svgEl);
			const width = pre.dataset.width;
			const height = pre.dataset.height;
			if (width) svgEl.style.width = `${width}px`;
			if (height) svgEl.style.height = `${height}px`;
		}
		pre.dataset.processed = "true";
	} catch (error) {
		console.error("[mermaid] render error:", error);
		fail(pre, error instanceof Error ? error.message : String(error));
		pre.dataset.processed = "true";
	} finally {
		delete pre.dataset.rendering;
	}
};

export const observeMermaid = (root: ParentNode = document): void => {
	const pres = [...root.querySelectorAll<HTMLPreElement>("pre.mermaid")].filter(
		(pre) => pre.dataset.processed !== "true",
	);
	if (!pres.length) return;
	if (!("IntersectionObserver" in window)) {
		void Promise.all(pres.map((pre) => render(pre)));
		return;
	}
	const pending = new Set(pres);
	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const pre = entry.target as HTMLPreElement;
				if (!entry.isIntersecting || !pending.delete(pre)) continue;
				io.unobserve(pre);
				void render(pre);
			}
			if (!pending.size) io.disconnect();
		},
		{ rootMargin: "300px" },
	);
	for (const pre of pres) io.observe(pre);
};

let observer: MutationObserver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

const refresh = (): void => {
	if (theme().map(hex).join(",") === currentKey) return;
	for (const pre of document.querySelectorAll<HTMLPreElement>(
		"pre.mermaid[data-processed]",
	)) {
		void render(pre, true);
	}
	observeMermaid();
};

export const observeTheme = (): void => {
	if (observer) return;
	observer = new MutationObserver(() => {
		clearTimeout(timer);
		timer = setTimeout(refresh, 50);
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["data-theme"],
	});
};
