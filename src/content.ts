import type { CollectionEntry } from "astro:content";
import { getCollection, getEntry } from "astro:content";
import { formatDate, type Locale } from "./i18n";
import type { Article, Member, Organization, Project } from "./site";

export const postId = (entry: CollectionEntry<"posts">): string =>
	entry.id.replace(/^(?:en-us|zh-cn)\//, "");

export const postEntries = (
	locale: Locale,
): Promise<CollectionEntry<"posts">[]> =>
	getCollection("posts", ({ data }) => !data.locale || data.locale === locale);

export const posts = async (locale: Locale): Promise<readonly Article[]> =>
	(await postEntries(locale))
		.sort(
			(left, right) =>
				right.data.pubDate.getTime() - left.data.pubDate.getTime(),
		)
		.map((entry) => article(entry, locale));

export const article = (
	entry: CollectionEntry<"posts">,
	locale: Locale,
): Article => ({
	id: postId(entry),
	title: entry.data.title,
	...(entry.data.description ? { description: entry.data.description } : {}),
	date: formatDate(locale, entry.data.pubDate),
});

export const githubOrganization = async (): Promise<
	Organization | undefined
> => {
	const entry = await getEntry("github", "organization");
	return entry?.data.type === "organization" ? entry.data : undefined;
};

const githubEntries = async (): Promise<
	readonly CollectionEntry<"github">[]
> => ((await githubOrganization()) ? getCollection("github") : []);

export const githubProjects = async (): Promise<readonly Project[]> =>
	(await githubEntries()).flatMap((entry) =>
		entry.data.type === "project" ? [entry.data] : [],
	);

export const githubMembers = async (): Promise<readonly Member[]> =>
	(await githubEntries())
		.flatMap((entry) => (entry.data.type === "member" ? [entry.data] : []))
		.sort((left, right) => left.login.localeCompare(right.login));
