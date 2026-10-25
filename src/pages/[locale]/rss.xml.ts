import { type Locale, locales } from "../../i18n";
import { absolute, href, localized, path } from "../../link";
import { originOf, site } from "../../site";
import { postId, sortedPostEntries } from "../../content";
import type { APIRoute } from "astro";
import rss from "@astrojs/rss";

type Path = Readonly<{ params: Readonly<{ locale: Locale }> }>;

interface ItemInput {
	title: string;
	description?: string;
	pubDate: Date;
	link: string;
}

export const getStaticPaths = (): readonly Path[] =>
	locales.map((locale) => ({ params: { locale } }));

const postLink = (entryId: string, locale: Locale, origin: URL): string => {
	const route = localized(locale, `/blog/${entryId}`);
	return absolute(href(route), origin);
};

export const GET: APIRoute<Record<string, never>, { locale: Locale }> = async ({
	params,
	site: siteUrl,
}) => {
	const { locale } = params;
	const origin = originOf(siteUrl);
	const entries = await sortedPostEntries(locale);
	return rss({
		title: `${site.name} Blog`,
		description: `${site.name} blog feed (${locale})`,
		site: absolute(path("/"), origin),
		customData: `<language>${locale}</language>`,
		items: entries.map((entry): ItemInput => {
			const item: ItemInput = {
				title: entry.data.title,
				pubDate: entry.data.pubDate,
				link: postLink(postId(entry), locale, origin),
			};
			if (entry.data.description) {
				item.description = entry.data.description;
			}
			return item;
		}),
	});
};
