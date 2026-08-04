import { createMorph } from "morphicons/dom";

const reducedMotion =
	typeof window !== "undefined" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const initMorph = (root: ParentNode = document): void => {
	const triggers = root.querySelectorAll<HTMLElement>("[data-morph]");
	for (const trigger of triggers) {
		if (trigger.dataset.morphReady === "true") continue;
		trigger.dataset.morphReady = "true";
		const svg = trigger.matches("svg")
			? trigger
			: trigger.querySelector<SVGElement>("svg[data-morph-from]");
		if (!svg) continue;
		const from = svg.dataset.morphFrom;
		const to = svg.dataset.morphTo;
		if (from === undefined || to === undefined) continue;
		const path = svg.querySelector<SVGPathElement>("path[data-morph-path]");
		if (!path) continue;

		let morph: ReturnType<typeof createMorph> | undefined;
		const enter = () => {
			if (reducedMotion) {
				morph?.set(to);
				return;
			}
			morph ??= createMorph(path, from);
			morph.morphTo(to);
		};
		const leave = () => {
			if (reducedMotion) {
				morph?.set(from);
				return;
			}
			morph?.morphTo(from);
		};
		trigger.addEventListener("pointerenter", enter);
		trigger.addEventListener("pointerleave", leave);
		trigger.addEventListener("focusin", enter);
		trigger.addEventListener("focusout", leave);
	}
};
