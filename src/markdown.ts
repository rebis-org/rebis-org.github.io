import katex from "katex";
import {
	defineHastPlugin,
	type HastNode,
	type HastVisitorContext,
} from "satteri";

type Element = Extract<HastNode, { type: "element" }>;

const renderMath = (value: string, displayMode: boolean): string =>
	katex.renderToString(value, { displayMode, throwOnError: false });

export const mathematics = defineHastPlugin({
	name: "mathematics",
	element: {
		filter: ["code"],
		visit(node: Readonly<Element>, context: HastVisitorContext) {
			const mode = node.properties.className?.find((value) =>
				value.startsWith("math-"),
			);
			if (!mode) return;
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

export const diagrams = defineHastPlugin({
	name: "diagrams",
	element: {
		filter: ["pre"],
		visit(node: Readonly<Element>, context: HastVisitorContext) {
			const code = node.children[0];
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
			const meta = (code as Readonly<{ data?: Readonly<{ meta?: string }> }>)
				.data?.meta;
			const width = meta?.match(/\bw-(\d+)/)?.[1];
			const height = meta?.match(/\bh-(\d+)/)?.[1];
			const titleMatch = meta?.match(/\btitle=(?:"([^"]*)"|'([^']*)')/);
			const title = titleMatch?.[1] ?? titleMatch?.[2];
			const alignValue = meta?.match(/\balign=(left|right|center)\b/)?.[1];
			const align =
				alignValue === "left" ||
				alignValue === "right" ||
				alignValue === "center"
					? alignValue
					: undefined;
			const source = context.textContent(code).replace(/\n$/, "");
			const diagram: Element = {
				type: "element",
				tagName: "pre",
				properties: {
					className: ["mermaid"],
					...(width ? { "data-width": width } : {}),
					...(height ? { "data-height": height } : {}),
					...(align ? { "data-align": align } : {}),
				},
				children: [{ type: "text", value: source }],
			};
			if (!title) {
				context.replaceNode(node, diagram);
				return;
			}
			context.replaceNode(node, {
				type: "element",
				tagName: "figure",
				properties: {
					className: ["mermaid-figure"],
					...(align ? { "data-align": align } : {}),
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
		},
	},
});
