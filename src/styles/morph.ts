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

const listen = (
	trigger: HTMLElement,
	enter: () => void,
	leave: () => void,
): void => {
	trigger.addEventListener("pointerenter", enter);
	trigger.addEventListener("pointerleave", leave);
	trigger.addEventListener("focusin", enter);
	trigger.addEventListener("focusout", leave);
};

interface MorphTarget {
	path: SVGPathElement;
	from: string;
	to: string;
}

const morphTarget = (trigger: HTMLElement): MorphTarget | undefined => {
	const svg = trigger.matches("svg")
		? trigger
		: trigger.querySelector<SVGElement>("svg[data-morph-from]");
	const path = svg?.querySelector<SVGPathElement>("path[data-morph-path]");
	const from = svg?.dataset.morphFrom;
	const to = svg?.dataset.morphTo;
	if (!svg || !path || from === undefined || to === undefined) {
		return undefined;
	}
	return { path, from, to };
};

const wire = (trigger: HTMLElement): void => {
	if (trigger.dataset.morphReady === "true") {
		return;
	}
	trigger.dataset.morphReady = "true";
	const target = morphTarget(trigger);
	if (!target) {
		return;
	}
	const transition = morpher(target.path, target.from);
	const enter = (): void => transition(target.to);
	const leave = (): void => transition(target.from);
	listen(trigger, enter, leave);
};

export const initMorph = (root: ParentNode = document): void => {
	for (const trigger of root.querySelectorAll<HTMLElement>("[data-morph]")) {
		wire(trigger);
	}
};
