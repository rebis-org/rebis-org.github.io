import type { Theme } from "./theme";

type MermaidModule = typeof import("mermaid");
type Mermaid = MermaidModule["default"];

const diagramColors = ({
	ink,
	paper,
	muted,
}: Readonly<{ ink: string; paper: string; muted: string }>) => ({
	lineColor: muted,
	textColor: ink,
	arrowheadColor: muted,
	primaryTextColor: ink,
	titleColor: ink,
	primaryColor: paper,
	primaryBorderColor: muted,
	mainBkg: paper,
	nodeBkg: paper,
	nodeBorder: muted,
	clusterBkg: paper,
	clusterBorder: muted,
	edgeLabelBackground: paper,
	actorBorder: muted,
	actorBkg: paper,
	actorLineColor: muted,
	signalColor: ink,
} as const);

const palette = {
	light: diagramColors({ ink: "#000000", paper: "#ffffff", muted: "#808080" }),
	dark: diagramColors({ ink: "#ffffff", paper: "#000000", muted: "#808080" }),
} as const;

let mermaid: Mermaid | undefined;
let initializedTheme: Theme | undefined;
let lastTheme: Theme | undefined;
let themeDebounce: ReturnType<typeof setTimeout> | undefined;
let themeObserver: MutationObserver | undefined;

const loadMermaid = async (): Promise<Mermaid> => {
	if (!mermaid) mermaid = (await import("mermaid")).default;
	return mermaid;
};

const ready = async (theme: Theme): Promise<Mermaid> => {
	const instance = await loadMermaid();
	if (initializedTheme !== theme) {
		instance.initialize({
			startOnLoad: false,
			theme: theme === "dark" ? "dark" : "default",
			themeVariables: { background: "transparent", ...palette[theme] },
		});
		initializedTheme = theme;
	}
	return instance;
};

const themeOf = (): Theme => {
	const htmlTheme = document.documentElement.dataset.theme;
	if (htmlTheme === "dark") return "dark";
	if (htmlTheme === "light") return "light";
	const bodyTheme = document.body?.dataset.theme;
	if (bodyTheme === "dark") return "dark";
	if (bodyTheme === "light") return "light";
	if (document.documentElement.classList.contains("dark")) return "dark";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

const sourceOf = (diagram: HTMLPreElement): string => {
	let source = diagram.dataset.diagram;
	if (source === undefined) {
		source = (diagram.textContent ?? "").replace(/\n$/, "");
		diagram.dataset.diagram = source;
	}
	return source;
};

const claim = (diagram: HTMLPreElement): boolean => {
	if (
		diagram.dataset.processed === "true" ||
		diagram.dataset.rendering === "true"
	) {
		return false;
	}
	diagram.dataset.rendering = "true";
	return true;
};

const fit = (diagram: HTMLPreElement, svg: SVGSVGElement): void => {
	const width = diagram.dataset.width;
	const height = diagram.dataset.height;
	if (width) svg.style.width = `${width}px`;
	if (height) svg.style.height = `${height}px`;
};

const fail = (diagram: HTMLPreElement, message: string): void => {
	const box = document.createElement("div");
	box.className = "mermaid-error";
	const detail = document.createElement("p");
	detail.textContent = `Error rendering diagram: ${message}`;
	const source = document.createElement("pre");
	source.textContent = sourceOf(diagram);
	box.append(detail, source);
	diagram.replaceChildren(box);
};

const renderOne = async (diagram: HTMLPreElement): Promise<void> => {
	if (!claim(diagram)) return;
	try {
		const instance = await ready(themeOf());
		const { svg, bindFunctions } = await instance.render(
			crypto.randomUUID(),
			sourceOf(diagram),
		);
		diagram.replaceChildren();
		diagram.innerHTML = svg;
		const svgElement = diagram.querySelector("svg");
		if (svgElement) {
			bindFunctions?.(svgElement);
			fit(diagram, svgElement);
		}
		diagram.dataset.processed = "true";
	} catch (error) {
		console.error("[mermaid] render error:", error);
		fail(diagram, error instanceof Error ? error.message : String(error));
		diagram.dataset.processed = "true";
	} finally {
		delete diagram.dataset.rendering;
	}
};

export const observeMermaid = (root: ParentNode = document): void => {
	const diagrams = [
		...root.querySelectorAll<HTMLPreElement>("pre.mermaid"),
	].filter((diagram) => diagram.dataset.processed !== "true");
	if (diagrams.length === 0) return;
	if (!("IntersectionObserver" in window)) {
		void Promise.all(diagrams.map(renderOne));
		return;
	}
	const pending = new Set(diagrams);
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const diagram = entry.target as HTMLPreElement;
				if (!pending.has(diagram)) continue;
				pending.delete(diagram);
				observer.unobserve(diagram);
				void renderOne(diagram);
			}
			if (pending.size === 0) observer.disconnect();
		},
		{ rootMargin: "300px" },
	);
	for (const diagram of diagrams) observer.observe(diagram);
};

export const observeTheme = (): void => {
	if (themeObserver) return;
	const refresh = (): void => {
		const theme = themeOf();
		if (theme === lastTheme) return;
		lastTheme = theme;
		for (const diagram of document.querySelectorAll<HTMLPreElement>(
			"pre.mermaid[data-processed]",
		)) {
			diagram.removeAttribute("data-processed");
		}
		observeMermaid();
	};
	themeObserver = new MutationObserver(() => {
		clearTimeout(themeDebounce);
		themeDebounce = setTimeout(refresh, 50);
	});
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["data-theme", "class"],
	});
	if (document.body) {
		themeObserver.observe(document.body, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
	}
};
