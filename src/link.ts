import { getRelativeLocaleUrl } from "astro:i18n";
import { type Locale, locales } from "./i18n";

const brand = Symbol("link");
const base = import.meta.env.BASE_URL;
const basePrefix = base.replace(/\/+$/, "");
const localePrefix = new RegExp(`^/(?:${locales.join("|")})(?=/|$)`);

export type Link = Readonly<{
	readonly [brand]: typeof brand;
	readonly kind: "internal" | "external" | "mail";
	readonly value: string;
}>;

const create = (kind: Link["kind"], value: string): Link => ({
	[brand]: brand,
	kind,
	value,
});

export const internal = (value: string): Link => create("internal", value);
export const external = (value: string): Link => create("external", value);
export const mail = (address: string): Link =>
	create("mail", `mailto:${address}`);

export const path = (value: string): string => {
	const pathname = `/${value.replace(/^\/+/, "")}`;
	return basePrefix &&
		(pathname === basePrefix || pathname.startsWith(`${basePrefix}/`))
		? pathname
		: `${base}${pathname.slice(1)}`;
};

export const localized = (locale: Locale, route = "/"): Link =>
	internal(
		getRelativeLocaleUrl(
			locale,
			route === "/" ? undefined : route.replace(/^\/+/, ""),
		),
	);

export const localizedFile = (locale: Locale, file: string): Link =>
	internal(`/${locale}/${file.replace(/^\/+/, "")}`);

export const href = (link: Link): string =>
	link.kind === "internal" ? path(link.value) : link.value;

export const route = (url: URL): string => {
	const pathname =
		basePrefix &&
		(url.pathname === basePrefix || url.pathname.startsWith(`${basePrefix}/`))
			? url.pathname.slice(basePrefix.length)
			: url.pathname;
	return pathname.replace(localePrefix, "") || "/";
};

export const absolute = (value: string, origin: URL): string =>
	new URL(value, origin).href;

export type LinkAttributes = Readonly<{ target?: string; rel?: string }>;

export const linkAttributes = (link: Link): LinkAttributes =>
	link.kind === "external"
		? { target: "_blank", rel: "noopener noreferrer" }
		: {};
