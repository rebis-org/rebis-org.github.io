import type { IconInput } from "morphicons";
import { createMorph } from "morphicons/dom";

export const morpher = (
	path: SVGPathElement,
	from: IconInput | string,
): ((to: IconInput | string) => void) => {
	let morph: ReturnType<typeof createMorph> | undefined;
	return (to) => {
		morph ??= createMorph(path, from, { reducedMotion: "user" });
		morph.morphTo(to);
	};
};

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

		const transition = morpher(path, from);
		const enter = (): void => transition(to);
		const leave = (): void => transition(from);
		trigger.addEventListener("pointerenter", enter);
		trigger.addEventListener("pointerleave", leave);
		trigger.addEventListener("focusin", enter);
		trigger.addEventListener("focusout", leave);
	}
};
