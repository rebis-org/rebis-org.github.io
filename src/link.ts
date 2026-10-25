import { type Locale, stripLocale } from "./i18n";
import { getRelativeLocaleUrl } from "astro:i18n";

const brand = Symbol("link");
const base = import.meta.env.BASE_URL;
const basePrefix = base.replace(/\/+$/u, "");

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

const hasBase = (pathname: string): boolean =>
	Boolean(basePrefix) &&
	(pathname === basePrefix || pathname.startsWith(`${basePrefix}/`));

export const stripBase = (pathname: string): string =>
	hasBase(pathname) ? pathname.slice(basePrefix.length) || "/" : pathname;

export const path = (value: string): string => {
	const pathname = `/${value.replace(/^\/+/u, "")}`;
	return hasBase(pathname) ? pathname : `${base}${pathname.slice(1)}`;
};

export const localized = (locale: Locale, route = "/"): Link =>
	internal(
		getRelativeLocaleUrl(
			locale,
			route === "/" ? undefined : route.replace(/^\/+/u, ""),
		),
	);

export const localizedFile = (locale: Locale, file: string): Link =>
	internal(`/${locale}/${file.replace(/^\/+/u, "")}`);

export const href = (link: Link): string =>
	link.kind === "internal" ? path(link.value) : link.value;

export const route = (url: URL): string => stripLocale(stripBase(url.pathname));

export const absolute = (value: string, origin: URL): string =>
	new URL(value, origin).href;

export type LinkAttributes = Readonly<{ target?: string; rel?: string }>;

export const linkAttributes = (link: Link): LinkAttributes =>
	link.kind === "external"
		? { target: "_blank", rel: "noopener noreferrer" }
		: {};
