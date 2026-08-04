import type { CollectionEntry } from "astro:content";
import { getCollection, getEntry } from "astro:content";
import { formatDate, type Locale, locales } from "./i18n";
import type { Article, Member, Organization, Project } from "./site";

type PostEntry = CollectionEntry<"posts">;
type GithubEntry = CollectionEntry<"github">;
const localePrefix = new RegExp(`^(?:${locales.join("|")})/`);
const byDate = (left: PostEntry, right: PostEntry): number =>
	right.data.pubDate.getTime() - left.data.pubDate.getTime();

export const postId = (entry: PostEntry): string =>
	entry.id.replace(localePrefix, "");

export const postEntries = (locale: Locale): Promise<PostEntry[]> =>
	getCollection("posts", ({ data }) => !data.locale || data.locale === locale);

export const article = (entry: PostEntry, locale: Locale): Article => ({
	id: postId(entry),
	title: entry.data.title,
	...(entry.data.description ? { description: entry.data.description } : {}),
	date: formatDate(locale, entry.data.pubDate),
});

export const sortedPostEntries = async (locale: Locale): Promise<PostEntry[]> =>
	(await postEntries(locale)).toSorted(byDate);

export const posts = async (locale: Locale): Promise<readonly Article[]> =>
	(await sortedPostEntries(locale)).map((entry) => article(entry, locale));

const githubEntries = async (): Promise<readonly GithubEntry[]> => {
	return (await githubOrganization()) ? getCollection("github") : [];
};

export const githubOrganization = async (): Promise<
	Organization | undefined
> => {
	const entry = await getEntry("github", "organization");
	return entry?.data.type === "organization" ? entry.data : undefined;
};

export const githubProjects = async (): Promise<readonly Project[]> =>
	(await githubEntries()).flatMap((entry) =>
		entry.data.type === "project" ? [entry.data] : [],
	);

export const githubMembers = async (): Promise<readonly Member[]> =>
	(await githubEntries())
		.flatMap((entry) => (entry.data.type === "member" ? [entry.data] : []))
		.toSorted((left, right) => left.login.localeCompare(right.login));
