import {
	type HastNode,
	type HastVisitorContext,
	defineHastPlugin,
} from "satteri";
import { renderToString } from "katex";

type Element = Extract<HastNode, { type: "element" }>;

const renderMath = (value: string, displayMode: boolean): string =>
	renderToString(value, { displayMode, throwOnError: false });

export const mathematics = defineHastPlugin({
	name: "mathematics",
	element: {
		filter: ["code"],
		visit(node: Readonly<Element>, context: HastVisitorContext) {
			const mode = node.properties.className?.find((value) =>
				value.startsWith("math-"),
			);
			if (!mode) {
				return;
			}
			const display = mode === "math-display";
			const parent = context.parent(node);
			const target =
				display && parent?.type === "element" && parent.tagName === "pre"
					? parent
					: node;
			context.replaceNode(target, {
				type: "raw",
				value: renderMath(context.textContent(node), display),
			});
		},
	},
});

type DiagramOptions = Readonly<{
	width: string | undefined;
	height: string | undefined;
	align: string | undefined;
}>;

type WithMeta = Readonly<{ data?: Readonly<{ meta?: string }> }>;

const metaOf = (code: Readonly<Element>): string | undefined =>
	(code as Readonly<WithMeta>).data?.meta;

const metaValue = (
	meta: string | undefined,
	pattern: RegExp,
): string | undefined => meta?.match(pattern)?.groups?.value;

const diagramOptions = (meta: string | undefined): DiagramOptions => {
	const width = metaValue(meta, /\bw-(?<value>\d+)/u);
	const height = metaValue(meta, /\bh-(?<value>\d+)/u);
	const alignValue = metaValue(meta, /\balign=(?<value>left|right|center)\b/u);
	const align =
		alignValue === "left" || alignValue === "right" || alignValue === "center"
			? alignValue
			: undefined;
	return { width, height, align };
};

const diagramTitle = (meta: string | undefined): string | undefined => {
	const match = meta?.match(
		/\btitle=(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|(?<bare>\S+))/u,
	);
	return match?.groups?.double ?? match?.groups?.single ?? match?.groups?.bare;
};

const diagramElement = (source: string, options: DiagramOptions): Element => ({
	type: "element",
	tagName: "pre",
	properties: {
		className: ["mermaid"],
		...(options.width ? { "data-width": options.width } : {}),
		...(options.height ? { "data-height": options.height } : {}),
		...(options.align ? { "data-align": options.align } : {}),
	},
	children: [{ type: "text", value: source }],
});

const figureElement = (
	diagram: Element,
	title: string,
	options: DiagramOptions,
): Element => ({
	type: "element",
	tagName: "figure",
	properties: {
		className: ["mermaid-figure"],
		...(options.align ? { "data-align": options.align } : {}),
	},
	children: [
		diagram,
		{
			type: "element",
			tagName: "figcaption",
			properties: {},
			children: [{ type: "text", value: title }],
		},
	],
});

export const diagrams = defineHastPlugin({
	name: "diagrams",
	element: {
		filter: ["pre"],
		visit(node: Readonly<Element>, context: HastVisitorContext) {
			const [code] = node.children;
			const language =
				node.properties.dataLanguage ?? node.properties["data-language"];
			if (
				code?.type !== "element" ||
				code.tagName !== "code" ||
				(language !== "mermaid" &&
					!code.properties.className?.includes("language-mermaid"))
			) {
				return;
			}
			const meta = metaOf(code);
			const options = diagramOptions(meta);
			const title = diagramTitle(meta);
			const source = context.textContent(code).replace(/\n$/u, "");
			const diagram = diagramElement(source, options);
			context.replaceNode(
				node,
				title ? figureElement(diagram, title, options) : diagram,
			);
		},
	},
});
