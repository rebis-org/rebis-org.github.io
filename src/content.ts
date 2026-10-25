import type { Article, Member, Organization, Project } from "./site";
import { type CollectionEntry, getCollection, getEntry } from "astro:content";
import { type Locale, formatDate, locales } from "./i18n";

type PostEntry = CollectionEntry<"posts">;
type GithubEntry = CollectionEntry<"github">;
const localePrefix = new RegExp(`^(?:${locales.join("|")})/`, "u");
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

export const sortedPostEntries = async (
	locale: Locale,
): Promise<PostEntry[]> => {
	const entries = await postEntries(locale);
	return entries.filter(({ data }) => data.sealed !== true).toSorted(byDate);
};

export const posts = async (locale: Locale): Promise<readonly Article[]> => {
	const entries = await sortedPostEntries(locale);
	return entries.map((entry) => article(entry, locale));
};

const ofType =
	<Type extends GithubEntry["data"]["type"]>(type: Type) =>
	(
		entry: GithubEntry,
	): entry is GithubEntry & {
		data: Extract<GithubEntry["data"], { type: Type }>;
	} =>
		entry.data.type === type;

export const githubOrganization = async (): Promise<
	Organization | undefined
> => {
	const entry = await getEntry("github", "organization");
	return entry?.data.type === "organization" ? entry.data : undefined;
};

const githubEntries = async (): Promise<readonly GithubEntry[]> => {
	const organization = await githubOrganization();
	return organization ? getCollection("github") : [];
};

export const githubProjects = async (): Promise<readonly Project[]> => {
	const entries = await githubEntries();
	return entries
		.filter((entry) => ofType("project")(entry))
		.map(({ data }) => data);
};

export const githubMembers = async (): Promise<readonly Member[]> => {
	const entries = await githubEntries();
	return entries
		.filter((entry) => ofType("member")(entry))
		.map(({ data }) => data)
		.toSorted((left, right) => left.login.localeCompare(right.login));
};
