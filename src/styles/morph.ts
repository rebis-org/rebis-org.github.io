import { createMorph } from "morphicons/dom";

const reducedMotion =
	typeof window !== "undefined" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const initMorph = (root: ParentNode = document): void => {
	for (const trigger of root.querySelectorAll<HTMLElement>("[data-morph]")) {
		if (trigger.dataset.morphReady === "true") continue;
		trigger.dataset.morphReady = "true";
		const svg = trigger.matches("svg")
			? trigger
			: trigger.querySelector<SVGElement>("svg[data-morph-from]");
		const path = svg?.querySelector<SVGPathElement>("path[data-morph-path]");
		const from = svg?.dataset.morphFrom;
		const to = svg?.dataset.morphTo;
		if (!svg || !path || from === undefined || to === undefined) continue;

		let morph: ReturnType<typeof createMorph> | undefined;
		const transition = (target: string): void => {
			morph ??= createMorph(path, from);
			if (!reducedMotion) morph.morphTo(target);
			else morph.set(target);
		};
		const enter = (): void => transition(to);
		const leave = (): void => transition(from);
		trigger.addEventListener("pointerenter", enter);
		trigger.addEventListener("pointerleave", leave);
		trigger.addEventListener("focusin", enter);
		trigger.addEventListener("focusout", leave);
	}
};
