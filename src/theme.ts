import { Moon, Sun } from "lucide";
import type { IconInput } from "morphicons";
import { createMorph } from "morphicons/dom";

export type Theme = "light" | "dark";

const storageKey = "theme";
const iconOf = (theme: Theme): IconInput => (theme === "dark" ? Moon : Sun);
type ThemeListener = (theme: Theme) => void;
const listeners = new Set<ThemeListener>();

export const onThemeChange = (listener: ThemeListener): (() => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const currentTheme = (): Theme =>
	document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export const installThemeToggle = (root: ParentNode = document): void => {
	const toggle = root.querySelector<HTMLButtonElement>("#theme-toggle");
	if (!toggle || toggle.dataset.ready === "true") return;
	toggle.dataset.ready = "true";
	const iconEl = root.querySelector<SVGElement>("#theme-icon");
	const path = iconEl?.querySelector<SVGPathElement>("path") ?? null;
	const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
	let morph: ReturnType<typeof createMorph> | undefined;

	const paint = (theme: Theme, from: Theme, animate: boolean): void => {
		if (!path) return;
		const target = iconOf(theme);
		if (!animate || reducedMotion) {
			morph ??= createMorph(path, target);
			morph.set(target);
			return;
		}
		morph ??= createMorph(path, iconOf(from));
		morph.morphTo(target);
	};

	const apply = (
		theme: Theme,
		from: Theme,
		persist: boolean,
		animate: boolean,
	): void => {
		document.documentElement.dataset.theme = theme;
		paint(theme, from, animate);
		toggle.setAttribute("aria-pressed", String(theme === "dark"));
		toggle.setAttribute(
			"aria-label",
			theme === "dark"
				? (toggle.dataset.lightModeLabel ?? "Switch to light mode")
				: (toggle.dataset.darkModeLabel ?? "Switch to dark mode"),
		);
		if (persist) localStorage.setItem(storageKey, theme);
	};

	apply(currentTheme(), currentTheme(), false, false);
	toggle.addEventListener("click", () => {
		const from = currentTheme();
		const next = from === "dark" ? "light" : "dark";
		apply(next, from, true, true);
		for (const listener of listeners) listener(next);
	});
};
