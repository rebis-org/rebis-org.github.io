import { getRelativeLocaleUrl } from "astro:i18n";
import type { Locale } from "./i18n";

const brand = Symbol("link");

export type Link = Readonly<{
	readonly [brand]: typeof brand;
	readonly kind: "internal" | "external" | "mail";
	readonly value: string;
}>;

const of = (kind: Link["kind"], value: string): Link => ({
	[brand]: brand,
	kind,
	value,
});

export const internal = (value: string): Link => of("internal", value);
export const external = (value: string): Link => of("external", value);
export const mail = (address: string): Link => of("mail", `mailto:${address}`);

const base = import.meta.env.BASE_URL;

export const path = (value: string): string =>
	`${base}${value.replace(/^\//, "")}`;

export const localized = (locale: Locale, route = "/"): Link =>
	internal(
		getRelativeLocaleUrl(locale, route === "/" ? undefined : route.slice(1)),
	);

export const href = (link: Link): string =>
	link.kind === "internal"
		? `${base}${link.value.replace(/^\//, "")}`
		: link.value;

export type LinkAttributes = Readonly<{ target?: string; rel?: string }>;

export const linkAttributes = (link: Link): LinkAttributes =>
	link.kind === "external"
		? { target: "_blank", rel: "noopener noreferrer" }
		: {};
