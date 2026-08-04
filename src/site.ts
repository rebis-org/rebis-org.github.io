import type { CollectionEntry } from "astro:content";
import {
	CircleDot,
	CodeXml,
	Copyleft,
	GitFork,
	GitPullRequestArrow,
	Mail,
	Star,
} from "lucide";
import type { IconInput } from "morphicons";
import { formatDate, type Locale, translate } from "./i18n";
import { external, type Link, localized, mail } from "./link";

export type Seo = Readonly<{
	title: string;
	description: string;
	image: string;
}>;
export type CitationPart =
	| Readonly<{ kind: "text"; value: string }>
	| Readonly<{ kind: "emphasis"; value: string }>
	| Readonly<{ kind: "link"; label: string; href: Link }>;
export type Header = Readonly<{
	title: string;
	subtitle: string;
	citation?: readonly CitationPart[];
}>;
export type Detail = Readonly<{
	label: string;
	value: string | number;
	icon?: IconInput;
}>;
export type Article = Readonly<{
	id: string;
	title: string;
	description?: string;
	date: string;
}>;
export type Organization = Extract<
	CollectionEntry<"github">["data"],
	{ readonly type: "organization" }
>;
export type Project = Extract<
	CollectionEntry<"github">["data"],
	{ readonly type: "project" }
>;
export type Member = Extract<
	CollectionEntry<"github">["data"],
	{ readonly type: "member" }
>;
export type Navigation = Readonly<{ title: string; link: Link }>;
export type Social = Readonly<{ title: string; link?: Link; icon: IconInput }>;
export type Quote = Readonly<{ text: string; source: string }>;
export type NameEntry = Readonly<{ term: string; quotes: readonly Quote[] }>;

const profileUrl = "https://github.com/rebis-org";
const codebergUrl = "https://codeberg.org/rebis-org";
const cnbUrl = "https://cnb.cool/rebis-org";
const lkmlUrl = "https://lkml.org/lkml/2000/8/25/132";
const tagline = "日月不失其體，故蔽而復明；江漢不失其源，故窮而復通。";
const seo = (title: string, description: string): Seo => ({
	title,
	description,
	image: "/logo/lignt.webp",
});

export const site = {
	name: "盐梅 Rebis",
	logo: { light: "/logo/lignt.webp", dark: "/logo/dark.webp" },
	profile: external(profileUrl),
} satisfies Readonly<{
	name: string;
	logo: Readonly<{ light: string; dark: string }>;
	profile: Link;
}>;

export const pages = {
	home: {
		seo: seo(site.name, tagline),
		hero: {
			title: "Software:",
			items: ["Free;", "Open-source; or", "Source-available."],
		},
	},
	about: {
		seo: seo(`About | ${site.name}`, tagline),
		name: [
			{
				term: "鹽梅",
				quotes: [
					{ text: "若作和羹，爾惟鹽梅。", source: "《說命》" },
					{ text: "聲得鹽梅，響滑榆槿。", source: "《文心雕龍》卷七《聲律》" },
				],
			},
			{
				term: "Rebis",
				quotes: [
					{
						text: "Only when you make the two one, and in such a way that you make the man and the woman a single One in order that the man is not the man and the woman is not the woman, then you will go into the Kingdom.",
						source: "<em>Gos. Thom.</em> 22",
					},
				],
			},
		],
	},
	projects: { seo: seo(`Projects | ${site.name}`, tagline) },
	blog: { seo: seo(`Blog | ${site.name}`, tagline) },
} satisfies Readonly<{
	home: Readonly<{
		seo: Seo;
		hero: Readonly<{ title: string; items: readonly string[] }>;
	}>;
	about: Readonly<{ seo: Seo; name: readonly NameEntry[] }>;
	projects: Readonly<{ seo: Seo }>;
	blog: Readonly<{ seo: Seo }>;
}>;

const nav = [
	["/", "nav.home"],
	["/about", "nav.about"],
	["/projects", "nav.projects"],
	["/blog", "nav.blog"],
] as const satisfies readonly (readonly [
	route: string,
	key: "nav.home" | "nav.about" | "nav.projects" | "nav.blog",
])[];

export const navigation = (locale: Locale): readonly Navigation[] =>
	nav.map(([route, key]) => ({
		title: translate(locale, key),
		link: localized(locale, route),
	}));

const githubIcon: IconInput =
	"M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22";

const codebergIcon: IconInput =
	"M 11.959 1.449 A 11.000 11.000 0 0 0 1.000 12.448 A 11.000 11.000 0 0 0 2.680 18.291 L 11.851 6.434 A 0.172 0.128 0 0 1 12.148 6.434 L 21.320 18.291 A 11.000 11.000 0 0 0 23.000 12.448 A 11.000 11.000 0 0 0 12.000 1.449 A 11.000 11.000 0 0 0 11.959 1.449 Z M 12.207 6.583 A 0.096 0.072 0 0 0 12.113 6.668 L 16.351 22.551 A 11.000 11.000 0 0 0 21.320 18.291 L 12.290 6.618 A 0.096 0.072 0 0 0 12.207 6.583 Z";

const cnbIcon: IconInput =
	"M 17.168 3.018 C 17.241 2.813 17.168 2.579 17.007 2.433 C 16.451 1.950 15.060 0.926 12.981 0.780 C 10.639 0.605 9.190 1.234 8.458 1.702 C 8.136 1.906 8.121 2.360 8.414 2.579 L 14.372 7.216 C 14.899 7.626 15.675 7.392 15.880 6.763 L 17.153 3.018 H 17.168 Z M 2.470 16.767 C 2.221 16.928 2.119 17.235 2.192 17.513 C 2.412 18.332 3.100 20.015 5.018 21.565 C 6.935 23.101 9.204 23.276 10.171 23.247 C 10.463 23.247 10.712 23.057 10.800 22.779 L 14.621 10.697 C 14.899 9.819 13.918 9.088 13.157 9.600 L 2.470 16.767 Z M 5.266 4.012 C 5.076 3.939 4.871 3.954 4.695 4.041 C 3.993 4.422 2.177 5.607 1.240 8.049 C 0.509 9.922 0.757 11.999 0.962 13.008 C 1.021 13.344 1.372 13.534 1.694 13.403 L 13.157 8.927 C 13.977 8.605 13.977 7.450 13.157 7.128 L 5.266 4.012 Z M 22.277 12.673 C 22.614 12.892 23.068 12.702 23.126 12.307 C 23.273 11.254 23.404 9.440 22.804 8.050 C 21.999 6.222 20.623 5.081 19.964 4.628 C 19.759 4.481 19.481 4.496 19.291 4.671 L 16.392 7.231 C 15.924 7.655 15.968 8.401 16.495 8.752 L 22.277 12.673 Z M 14.182 22.457 C 14.152 22.794 14.445 23.086 14.782 23.042 C 15.880 22.925 18.134 22.486 19.818 20.877 C 21.457 19.312 21.999 17.455 22.145 16.709 C 22.189 16.504 22.145 16.299 22.014 16.138 L 16.948 9.892 C 16.407 9.219 15.309 9.556 15.236 10.419 L 14.182 22.442 V 22.457 Z";

export const social = (email: string | null | undefined): readonly Social[] => [
	{ title: "GitHub", link: site.profile, icon: githubIcon },
	{ title: "Codeberg", link: external(codebergUrl), icon: codebergIcon },
	{ title: "CNB", link: external(cnbUrl), icon: cnbIcon },
	...(email
		? [{ title: "Mail", link: mail(email), icon: Mail }]
		: [{ title: "Mail", icon: Mail }]),
];

export const header = (
	locale: Locale,
	page: "about" | "projects" | "blog",
): Header => {
	const citation: readonly CitationPart[] =
		page === "about"
			? [{ kind: "text", value: translate(locale, "header.about.citation") }]
			: page === "projects"
				? [
						{
							kind: "link",
							label: translate(locale, "header.projects.author"),
							href: external(lkmlUrl),
						},
					]
				: [
						{ kind: "text", value: translate(locale, "header.blog.author") },
						{ kind: "emphasis", value: translate(locale, "header.blog.title") },
						{ kind: "text", value: translate(locale, "header.blog.publisher") },
					];
	return {
		title: translate(locale, `nav.${page}`),
		subtitle: translate(locale, `header.${page}`),
		citation,
	};
};

export const homeHeader = (organization: Organization | undefined): Header => ({
	title: organization?.name ?? "N/A",
	subtitle: tagline,
});

export const projectDetails = (
	project: Project,
	locale: Locale,
): readonly Detail[] => [
	{
		label: translate(locale, "project.language"),
		value: project.language ?? "-",
		icon: CodeXml,
	},
	{
		label: translate(locale, "project.license"),
		value:
			project.license === "NOASSERTION" ? "Other" : (project.license ?? "-"),
		icon: Copyleft,
	},
	{
		label: translate(locale, "project.forks"),
		value: project.forks,
		icon: GitFork,
	},
	{
		label: translate(locale, "project.stars"),
		value: project.stars,
		icon: Star,
	},
	{
		label: translate(locale, "project.issues"),
		value: project.issues,
		icon: CircleDot,
	},
	{
		label: translate(locale, "project.pullRequests"),
		value: project.pullRequests,
		icon: GitPullRequestArrow,
	},
	{
		label: translate(locale, "project.updated"),
		value: `${translate(locale, "project.updated")} ${formatDate(
			locale,
			project.updatedAt,
		)}`,
	},
];
