import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { postId, sortedPostEntries } from "../../content";
import { type Locale, locales } from "../../i18n";
import { absolute, href, localized, path } from "../../link";
import { site } from "../../site";

type Path = Readonly<{ params: Readonly<{ locale: Locale }> }>;

export const getStaticPaths = (): readonly Path[] =>
	locales.map((locale) => ({ params: { locale } }));

export const GET: APIRoute<Record<string, never>, { locale: Locale }> = async ({
	params,
	site: siteUrl,
}) => {
	const { locale } = params;
	const origin = siteUrl ?? new URL("https://rebis.cn");
	const entries = await sortedPostEntries(locale);
	return rss({
		title: `${site.name} Blog`,
		description: `${site.name} blog feed (${locale})`,
		site: absolute(path("/"), origin),
		customData: `<language>${locale}</language>`,
		items: entries.map((entry) => ({
			title: entry.data.title,
			...(entry.data.description
				? { description: entry.data.description }
				: {}),
			pubDate: entry.data.pubDate,
			link: absolute(href(localized(locale, `/blog/${postId(entry)}`)), origin),
		})),
	});
};
