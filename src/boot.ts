import { observeMermaid, observeTheme } from "./mermaid";
import type { BrowserPangu } from "pangu/browser";
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
let pangu: Promise<BrowserPangu> | undefined;
const spaceText = async (): Promise<void> => {
	if (hasPangu || !document.body) {
		return;
	}
	pangu ??= import("pangu/browser").then(({ default: instance }) => instance);
	const instance = await pangu;
	instance.spaceNode(document.body);
};

export const boot = (): void => {
	installThemeToggle();
	initMorph();
	observeMermaid();
	observeTheme();
	void spaceText();
};

document.addEventListener("rebis:unsealed", () => {
	initMorph();
	observeMermaid();
	void spaceText();
});
