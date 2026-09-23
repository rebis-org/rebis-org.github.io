import { observeMermaid, observeTheme } from "./mermaid";
import { initMorph } from "./styles/morph";
import { installThemeToggle } from "./theme";

const panguValues = [
	"normal",
	"no-autospace",
	"ideograph-alpha",
	"ideograph-numeric",
	"insert",
	"replace",
	"ideograph-alpha ideograph-numeric punctuation",
	"ideograph-alpha ideograph-numeric",
	"ideograph-alpha ideograph-numeric insert",
	"auto",
];
const hasPangu = panguValues.some((value) =>
	CSS.supports("text-autospace", value),
);
let pangu: Promise<typeof import("pangu/browser")["default"]> | undefined;
const spaceText = async (): Promise<void> => {
	if (hasPangu || !document.body) return;
	pangu ??= import("pangu/browser").then(({ default: instance }) => instance);
	(await pangu).spacingNode(document.body);
};

export const boot = (): void => {
	installThemeToggle();
	initMorph();
	observeMermaid();
	observeTheme();
	void spaceText();
};
