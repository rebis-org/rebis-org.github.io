import type { Theme } from "./theme";

type Diagram = Readonly<{ node: HTMLPreElement; source: string }>;

const margin = "256px";
const idle = (): void => {};
let generation = 0;
let visible: readonly Diagram[] = [];
let requestedTheme: Theme = "light";
let pending = false;
let rendering: Promise<void> | undefined;
let stopObserving: () => void = idle;

const render = async (): Promise<void> => {
	const diagrams = visible;
	const version = generation;
	const theme = requestedTheme;
	const current = (): boolean =>
		version === generation && diagrams === visible && theme === requestedTheme;
	pending = false;
	const { default: mermaid } = await import("mermaid");
	if (!current()) {
		pending = true;
		return;
	}
	diagrams.forEach(({ node, source }) => {
		node.removeAttribute("data-processed");
		node.replaceChildren(document.createTextNode(source));
	});
	mermaid.initialize({
		startOnLoad: false,
		theme: theme === "dark" ? "dark" : "default",
		themeVariables: {
			background: theme === "dark" ? "#000000" : "#ffffff",
			primaryColor: theme === "dark" ? "#202020" : "#ffffff",
			primaryTextColor: theme === "dark" ? "#ffffff" : "#000000",
			lineColor: "#808080",
		},
	});
	await mermaid.run({ nodes: diagrams.map(({ node }) => node) });
	if (!current()) pending = true;
};

const drain = async (): Promise<void> => {
	do {
		await render();
	} while (pending && visible.length > 0);
};

const schedule = (): void => {
	pending = true;
	if (rendering) return;
	rendering = drain().finally(() => {
		rendering = undefined;
		if (pending && visible.length > 0) schedule();
	});
};

export const observeMermaid = (
	theme: Theme,
	root: ParentNode = document,
): void => {
	generation += 1;
	const version = generation;
	requestedTheme = theme;
	visible = [];
	pending = false;
	stopObserving();
	const diagrams = [
		...root.querySelectorAll<HTMLPreElement>("pre.mermaid"),
	].map((node) => ({ node, source: node.textContent ?? "" }));
	if (diagrams.length === 0) return;
	if (!("IntersectionObserver" in window)) {
		visible = diagrams;
		schedule();
		return;
	}
	const awaiting = new Map<Element, Diagram>(
		diagrams.map((diagram) => [diagram.node, diagram]),
	);
	const observer = new IntersectionObserver(
		(entries) => {
			if (version !== generation) return;
			const entered: Diagram[] = [];
			for (const entry of entries) {
				const diagram = awaiting.get(entry.target);
				if (!entry.isIntersecting || !diagram) continue;
				awaiting.delete(entry.target);
				observer.unobserve(entry.target);
				entered.push(diagram);
			}
			if (entered.length === 0) return;
			visible = [...visible, ...entered];
			schedule();
			if (awaiting.size === 0) stopObserving();
		},
		{ rootMargin: margin },
	);
	stopObserving = () => {
		observer.disconnect();
		stopObserving = idle;
	};
	diagrams.forEach(({ node }) => {
		observer.observe(node);
	});
};

export const renderMermaid = (theme: Theme): void => {
	requestedTheme = theme;
	if (visible.length > 0) schedule();
};
