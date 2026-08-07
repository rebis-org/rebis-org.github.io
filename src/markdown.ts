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
			context.replaceNode(node, {
				type: "element",
				tagName: "pre",
				properties: { className: ["mermaid"] },
				children: [{ type: "text", value: context.textContent(code) }],
			});
		},
	},
});
