import { Moon, Sun } from "lucide";
import type { IconInput } from "morphicons";
import { morpher } from "./styles/morph";

export type Theme = "light" | "dark";

const storageKey = "theme";
const icon = (theme: Theme): IconInput => (theme === "dark" ? Moon : Sun);
const listeners = new Set<(theme: Theme) => void>();

export const onThemeChange = (
	listener: (theme: Theme) => void,
): (() => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

export const currentTheme = (): Theme =>
	document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export const installThemeToggle = (root: ParentNode = document): void => {
	const toggle = root.querySelector<HTMLButtonElement>("#theme-toggle");
	if (!toggle || toggle.dataset.ready === "true") return;
	toggle.dataset.ready = "true";
	const path = root.querySelector<SVGPathElement>("#theme-icon path");
	let transition: ReturnType<typeof morpher> | undefined;

	const paint = (theme: Theme, from: Theme, animate: boolean): void => {
		if (!path || !animate) return;
		transition ??= morpher(path, icon(from));
		transition(icon(theme));
	};

	const apply = (theme: Theme, from: Theme, interactive: boolean): void => {
		document.documentElement.dataset.theme = theme;
		paint(theme, from, interactive);
		toggle.setAttribute("aria-pressed", String(theme === "dark"));
		toggle.setAttribute(
			"aria-label",
			theme === "dark"
				? (toggle.dataset.lightModeLabel ?? "Switch to light mode")
				: (toggle.dataset.darkModeLabel ?? "Switch to dark mode"),
		);
		if (interactive) localStorage.setItem(storageKey, theme);
	};

	apply(currentTheme(), currentTheme(), false);
	toggle.addEventListener("click", () => {
		const from = currentTheme();
		const next: Theme = from === "dark" ? "light" : "dark";
		apply(next, from, true);
		listeners.forEach((listener) => {
			listener(next);
		});
	});
};
