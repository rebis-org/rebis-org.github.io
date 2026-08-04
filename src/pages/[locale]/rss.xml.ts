import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { postEntries, postId } from "../../content";
import { type Locale, locales } from "../../i18n";
import { href, localized } from "../../link";
import { site } from "../../site";

type Path = Readonly<{ params: Readonly<{ locale: Locale }> }>;

export const getStaticPaths = (): readonly Path[] =>
	locales.map((locale) => ({ params: { locale } }));

export const GET: APIRoute<Record<string, never>, { locale: Locale }> = async ({
	params,
	site: siteUrl,
}) => {
	const { locale } = params;
	const origin = siteUrl ?? new URL("https://rebis-org.github.io");
	const entries = await postEntries(locale);
	return rss({
		title: `${site.name} Blog`,
		description: `${site.name} blog feed (${locale})`,
		site: origin,
		customData: `<language>${locale}</language>`,
		items: entries.map((entry) => ({
			title: entry.data.title,
			...(entry.data.description
				? { description: entry.data.description }
				: {}),
			pubDate: entry.data.pubDate,
			link: new URL(href(localized(locale, `/blog/${postId(entry)}`)), origin)
				.href,
		})),
	});
};
