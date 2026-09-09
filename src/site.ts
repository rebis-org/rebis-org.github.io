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
import {
	formatDate,
	formatNumber,
	type Locale,
	type TranslationKey,
	translate,
} from "./i18n";
import {
	cnbIcon,
	codebergIcon,
	githubIcon,
	gitIcon,
	matrixIcon,
} from "./icons";
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
export type Citation = readonly CitationPart[];

export type Header = Readonly<{
	title: string;
	subtitle: string;
	citation?: Citation;
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

export type Organization = Readonly<{
	type: "organization";
	name: string;
	email: string | null;
}>;

export type Project = Readonly<{
	type: "project";
	title: string;
	description?: string | undefined;
	url: string;
	language?: string | undefined;
	license?: string | undefined;
	forks: number;
	stars: number;
	issues: number;
	pullRequests: number;
	updatedAt: string;
}>;

export type Member = Readonly<{
	type: "member";
	login: string;
	name: string;
	avatarUrl: string;
	url: string;
}>;

export type Navigation = Readonly<{ title: string; link: Link }>;
export type Social = Readonly<{ title: string; link?: Link; icon: IconInput }>;
type Quote = Readonly<{
	text: string;
	source: Citation;
}>;
type NameEntry = Readonly<{ term: string; quotes: readonly Quote[] }>;

const profileUrl = "https://github.com/rebis-org";
const codebergUrl = "https://codeberg.org/rebis-org";
const cnbUrl = "https://cnb.cool/rebis-org";
const cgitUrl = "https://cgit.rebis.cn";
const matrixUrl = "https://matrix.to/#/#rebis:matrix.rebis.cn";
const statusUrl = "https://status.rebis.cn";
const liberapayUrl = "https://liberapay.com/rebis-org/donate";
const lkmlUrl = "https://lkml.org/lkml/2000/8/25/132";
const tagline = "日月不失其體，故蔽而復明；江漢不失其源，故窮而復通。";
const logo = { light: "/logo/lignt.webp", dark: "/logo/dark.webp" };
export const seo = (title: string, description: string = tagline): Seo => ({
	title,
	description,
	image: logo.light,
});

export const site = {
	name: "盐梅 Rebis",
	logo,
	profile: external(profileUrl),
};

export const statusLink = external(statusUrl);

export const pages = {
	home: {
		seo: seo(site.name),
		hero: {
			title: "Software:",
			items: ["Free;", "Open-source; or", "Source-available."],
		},
	},
	about: {
		seo: seo(`About | ${site.name}`),
		name: [
			{
				term: "鹽梅",
				quotes: [
					{
						text: "若作和羹，爾惟鹽梅。",
						source: [{ kind: "text", value: "《說命》" }],
					},
					{
						text: "聲得鹽梅，響滑榆槿。",
						source: [{ kind: "text", value: "《文心雕龍》卷七《聲律》" }],
					},
				],
			},
			{
				term: "Rebis",
				quotes: [
					{
						text: "Only when you make the two one, and in such a way that you make the man and the woman a single One in order that the man is not the man and the woman is not the woman, then you will go into the Kingdom.",
						source: [
							{ kind: "emphasis", value: "Gos. Thom." },
							{ kind: "text", value: " 22" },
						],
					},
				],
			},
		] satisfies readonly NameEntry[],
	},
	projects: { seo: seo(`Projects | ${site.name}`) },
	blog: { seo: seo(`Blog | ${site.name}`) },
};

export type PageName = keyof typeof pages;
type HeaderPage = Exclude<PageName, "home">;
type NavigationKey = Extract<TranslationKey, `nav.${string}`>;

export const pageRoutes = [
	{ page: "home", route: "/", key: "nav.home" },
	{ page: "about", route: "/about", key: "nav.about" },
	{ page: "projects", route: "/projects", key: "nav.projects" },
	{ page: "blog", route: "/blog", key: "nav.blog" },
] satisfies readonly Readonly<{
	page: PageName;
	route: string;
	key: NavigationKey;
}>[];

export const navigation = (locale: Locale): readonly Navigation[] =>
	pageRoutes.map(({ route, key }) => ({
		title: translate(locale, key),
		link: localized(locale, route),
	}));

export const social = (email: string | null | undefined): readonly Social[] => [
	{ title: "GitHub", link: site.profile, icon: githubIcon },
	{ title: "Codeberg", link: external(codebergUrl), icon: codebergIcon },
	{ title: "CNB", link: external(cnbUrl), icon: cnbIcon },
	{ title: "Git", link: external(cgitUrl), icon: gitIcon },
	{ title: "Matrix", link: external(matrixUrl), icon: matrixIcon },
	{ title: "Mail", ...(email ? { link: mail(email) } : {}), icon: Mail },
];

const sentence = (
	locale: Locale,
	ns: "sponsor" | "donate",
	link: CitationPart,
): Citation => [
	{ kind: "text", value: translate(locale, `donate.${ns}.before`) },
	link,
	{ kind: "text", value: translate(locale, `donate.${ns}.after`) },
];

export const support = (
	locale: Locale,
	email: string | null | undefined,
): readonly Citation[] => [
	sentence(
		locale,
		"sponsor",
		email
			? {
					kind: "link",
					label: translate(locale, "donate.sponsor.link"),
					href: mail(email),
				}
			: { kind: "text", value: translate(locale, "donate.sponsor.link") },
	),
	sentence(locale, "donate", {
		kind: "link",
		label: translate(locale, "donate.donate.link"),
		href: external(liberapayUrl),
	}),
];

const citations: Record<HeaderPage, (locale: Locale) => Citation> = {
	about: (locale) => [
		{ kind: "text", value: translate(locale, "header.about.citation") },
	],
	projects: (locale) => [
		{
			kind: "link",
			label: translate(locale, "header.projects.author"),
			href: external(lkmlUrl),
		},
	],
	blog: (locale) => [
		{ kind: "text", value: translate(locale, "header.blog.author") },
		{ kind: "emphasis", value: translate(locale, "header.blog.title") },
		{ kind: "text", value: translate(locale, "header.blog.publisher") },
	],
};

export const header = (locale: Locale, page: HeaderPage): Header => ({
	title: translate(locale, `nav.${page}`),
	subtitle: translate(locale, `header.${page}`),
	citation: citations[page](locale),
});

export const homeHeader = (organization: Organization | undefined): Header => ({
	title: organization?.name ?? "N/A",
	subtitle: tagline,
});

export const projectDetails = (
	project: Project,
	locale: Locale,
): readonly Detail[] => {
	const rows: readonly (readonly [
		key: `project.${string}`,
		value: string | number,
		icon?: IconInput,
	])[] = [
		["project.language", project.language ?? "-", CodeXml],
		[
			"project.license",
			project.license === "NOASSERTION" ? "Other" : (project.license ?? "-"),
			Copyleft,
		],
		["project.forks", formatNumber(locale, project.forks), GitFork],
		["project.stars", formatNumber(locale, project.stars), Star],
		["project.issues", formatNumber(locale, project.issues), CircleDot],
		[
			"project.pullRequests",
			formatNumber(locale, project.pullRequests),
			GitPullRequestArrow,
		],
		[
			"project.updated",
			`${translate(locale, "project.updated")} ${formatDate(locale, project.updatedAt)}`,
		],
	];
	return rows.map(([key, value, icon]) => ({
		label: translate(locale, key as TranslationKey),
		value,
		...(icon ? { icon } : {}),
	}));
};
