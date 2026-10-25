import {
	type GenericSchema,
	type InferOutput,
	array,
	boolean,
	check,
	email,
	integer,
	isoTimestamp,
	minLength,
	minValue,
	nullish,
	number,
	object,
	pipe,
	safeParse,
	string,
	trim,
	url,
} from "valibot";
import { type GithubClient, client } from "./client";
import type { Member, Organization, Project } from "../../site";
import type { Loader } from "astro/loaders";
import { env } from "node:process";

const organizationLogin = "rebis-org";
const restOrigin = "https://api.github.com";
const pageLimit = 100;
const publicMembersPath = `/orgs/${organizationLogin}/public_members?per_page=100`;

const query = `query Organization($after: String) {
  organization(login: "${organizationLogin}") {
    name email
    membersWithRole(first: 100) {
      nodes { login name avatarUrl url }
    }
    repositories(first: 100, after: $after, privacy: PUBLIC, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { name description url updatedAt forkCount stargazerCount primaryLanguage { name } licenseInfo { spdxId } issues(first: 1, states: OPEN) { totalCount } pullRequests(first: 1, states: OPEN) { totalCount } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const text = pipe(string(), trim(), minLength(1));
const count = pipe(number(), integer(), minValue(0));
const httpsUrl = pipe(
	string(),
	url(),
	check((value) => value.startsWith("https://"), "expected an https URL"),
);
const emailSchema = nullish(pipe(string(), email()));
const languageSchema = nullish(object({ name: text }));
const licenseSchema = nullish(object({ spdxId: text }));
const memberIdentitySchema = object({ login: text });
const publicMembersSchema = array(memberIdentitySchema);
const memberSchema = object({
	login: text,
	name: nullish(string()),
	avatarUrl: httpsUrl,
	url: httpsUrl,
});
const repositorySchema = object({
	name: text,
	description: nullish(string()),
	url: httpsUrl,
	updatedAt: pipe(string(), isoTimestamp()),
	forkCount: count,
	stargazerCount: count,
	primaryLanguage: languageSchema,
	licenseInfo: licenseSchema,
	issues: object({ totalCount: count }),
	pullRequests: object({ totalCount: count }),
});
const pageInfoSchema = object({
	hasNextPage: boolean(),
	endCursor: nullish(string()),
});
const repositoriesSchema = object({
	nodes: array(repositorySchema),
	pageInfo: pageInfoSchema,
});
const organizationSchema = object({
	name: text,
	email: emailSchema,
	membersWithRole: object({ nodes: array(memberSchema) }),
	repositories: repositoriesSchema,
});
const pageSchema = object({
	data: object({ organization: organizationSchema }),
});

type Page = InferOutput<typeof pageSchema>;
type RawOrganization = Page["data"]["organization"];
type RawRepository = InferOutput<typeof repositorySchema>;
type RawMember = InferOutput<typeof memberSchema>;
type GithubData = Organization | Project | Member;

const parse = <Schema extends GenericSchema>(
	schema: Schema,
	value: unknown,
): InferOutput<Schema> | undefined => {
	const result = safeParse(schema, value);
	return result.success ? result.output : undefined;
};

const optional = <K extends string, V>(
	key: K,
	value: V | null | undefined,
): Record<string, never> | Record<K, NonNullable<V>> =>
	value ? ({ [key]: value } as Record<K, NonNullable<V>>) : {};

const organizationData = ({
	name,
	email: organizationEmail,
}: RawOrganization): Organization => ({
	type: "organization",
	name,
	email: organizationEmail ?? null,
});

const projectData = (repository: RawRepository): Project => ({
	type: "project",
	title: repository.name,
	...optional("description", repository.description),
	url: repository.url,
	...optional("language", repository.primaryLanguage?.name),
	...optional("license", repository.licenseInfo?.spdxId),
	forks: repository.forkCount,
	stars: repository.stargazerCount,
	issues: repository.issues.totalCount,
	pullRequests: repository.pullRequests.totalCount,
	updatedAt: repository.updatedAt,
});

const memberData = (member: RawMember): Member => ({
	type: "member",
	login: member.login,
	name: member.name ?? member.login,
	avatarUrl: member.avatarUrl,
	url: member.url,
});

type Snapshot = Readonly<{
	organization: Organization;
	projects: readonly Project[];
	members: readonly Member[];
}>;

const fetchPublicLogins = async (
	github: GithubClient,
): Promise<ReadonlySet<string>> => {
	const publicMembers = parse(
		publicMembersSchema,
		await github.get(publicMembersPath),
	);
	if (!publicMembers) {
		throw new Error("github loader: failed to fetch public members");
	}
	return new Set(publicMembers.map(({ login }) => login));
};

const fetchPage = async (
	github: GithubClient,
	cursor: string | null,
): Promise<Page> => {
	const result = parse(
		pageSchema,
		await github.query(query, { after: cursor }),
	);
	if (!result) {
		throw new Error("github loader: failed to fetch repositories");
	}
	return result;
};

const snapshotFrom = (
	organization: RawOrganization,
	projects: readonly Project[],
	publicLogins: ReadonlySet<string>,
): Snapshot => ({
	organization: organizationData(organization),
	projects,
	members: organization.membersWithRole.nodes
		.filter((member) => publicLogins.has(member.login))
		.map((member) => memberData(member)),
});

type Pagination = Readonly<{
	publicLogins: ReadonlySet<string>;
	seen: Set<string>;
	projects: Project[];
}>;

const nextCursor = (
	info: RawOrganization["repositories"]["pageInfo"],
	seen: ReadonlySet<string>,
): string => {
	if (!info.endCursor || seen.has(info.endCursor)) {
		throw new Error("github loader: unexpected pagination cursor");
	}
	return info.endCursor;
};

const appendPage = (
	state: Pagination,
	organization: RawOrganization,
): RawOrganization["repositories"]["pageInfo"] => {
	state.projects.push(...organization.repositories.nodes.map(projectData));
	return organization.repositories.pageInfo;
};

const paginate = async (
	github: GithubClient,
	state: Pagination,
	cursor: string | null,
): Promise<Snapshot> => {
	if (state.seen.size >= pageLimit) {
		throw new Error("github loader: exceeded repository pagination limit");
	}
	const result = await fetchPage(github, cursor);
	const organization: RawOrganization = result.data.organization;
	const info = appendPage(state, organization);
	if (!info.hasNextPage) {
		return snapshotFrom(organization, state.projects, state.publicLogins);
	}
	const next = nextCursor(info, state.seen);
	state.seen.add(next);
	return paginate(github, state, next);
};

const collect = async (token: string): Promise<Snapshot> => {
	const github = client(token, restOrigin);
	const publicLogins = await fetchPublicLogins(github);
	const state: Pagination = {
		publicLogins,
		seen: new Set(),
		projects: [],
	};
	return paginate(github, state, null);
};

export const githubLoader = {
	name: "github-organization",
	async load({
		store,
		parseData,
	}: Parameters<Loader["load"]>[0]): Promise<void> {
		store.clear();
		const token = env.GITHUB_TOKEN;
		if (!token) {
			return;
		}
		const snapshot = await collect(token);
		const entries: readonly (readonly [string, GithubData])[] = [
			["organization", snapshot.organization],
			...snapshot.projects.map(
				(project) => [`project:${project.title}`, project] as const,
			),
			...snapshot.members.map(
				(member) => [`member:${member.login}`, member] as const,
			),
		];
		await Promise.all(
			entries.map(async ([id, data]) =>
				store.set({ id, data: await parseData({ id, data }) }),
			),
		);
	},
} satisfies Loader;
