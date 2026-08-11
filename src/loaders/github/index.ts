import { env } from "node:process";
import type { Loader } from "astro/loaders";
import * as v from "valibot";
import type { Member, Organization, Project } from "../../site";
import { graphql } from "./graphql";
import { rest } from "./rest";

const login = "rebis-org";
const graphqlEndpoint = "https://api.github.com/graphql";
const restOrigin = "https://api.github.com";
const pageLimit = 100;
const publicMembersPath = `/orgs/${login}/public_members?per_page=100`;

const query = `query Organization($after: String) {
  organization(login: "${login}") {
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

const text = v.pipe(v.string(), v.trim(), v.minLength(1));
const count = v.pipe(v.number(), v.integer(), v.minValue(0));
const memberIdentitySchema = v.object({ login: text });
const publicMembersSchema = v.array(memberIdentitySchema);
const memberSchema = v.object({
	login: text,
	name: v.nullish(v.string()),
	avatarUrl: v.pipe(v.string(), v.url()),
	url: v.pipe(v.string(), v.url()),
});
const repositorySchema = v.object({
	name: text,
	description: v.nullish(v.string()),
	url: v.pipe(v.string(), v.url()),
	updatedAt: v.pipe(v.string(), v.isoTimestamp()),
	forkCount: count,
	stargazerCount: count,
	primaryLanguage: v.nullish(v.object({ name: text })),
	licenseInfo: v.nullish(v.object({ spdxId: text })),
	issues: v.object({ totalCount: count }),
	pullRequests: v.object({ totalCount: count }),
});
const pageSchema = v.object({
	data: v.object({
		organization: v.object({
			name: text,
			email: v.nullish(v.pipe(v.string(), v.email())),
			membersWithRole: v.object({ nodes: v.array(memberSchema) }),
			repositories: v.object({
				nodes: v.array(repositorySchema),
				pageInfo: v.object({
					hasNextPage: v.boolean(),
					endCursor: v.nullish(v.string()),
				}),
			}),
		}),
	}),
});

type Page = v.InferOutput<typeof pageSchema>;
type RawOrganization = Page["data"]["organization"];
type RawRepository = v.InferOutput<typeof repositorySchema>;
type RawMember = v.InferOutput<typeof memberSchema>;
type GithubData = Organization | Project | Member;

const parse = <Schema extends v.GenericSchema>(
	schema: Schema,
	value: unknown,
): v.InferOutput<Schema> | undefined => {
	const result = v.safeParse(schema, value);
	return result.success ? result.output : undefined;
};

const organizationData = ({ name, email }: RawOrganization): Organization => ({
	type: "organization",
	name,
	email: email ?? null,
});

const projectData = (repository: RawRepository): Project => ({
	type: "project",
	title: repository.name,
	...(repository.description ? { description: repository.description } : {}),
	url: repository.url,
	...(repository.primaryLanguage
		? { language: repository.primaryLanguage.name }
		: {}),
	...(repository.licenseInfo ? { license: repository.licenseInfo.spdxId } : {}),
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

const collect = async (token: string): Promise<Snapshot | undefined> => {
	const githubRest = rest(token, restOrigin);
	const githubGraphql = graphql(token, graphqlEndpoint);
	const publicMembers = parse(
		publicMembersSchema,
		await githubRest.get(publicMembersPath),
	);
	if (!publicMembers) return undefined;

	const publicLogins = new Set(publicMembers.map(({ login }) => login));
	const seen = new Set<string>();
	const projects: Project[] = [];
	let cursor: string | null = null;

	for (let page = 0; page < pageLimit; page += 1) {
		const result: Page | undefined = parse(
			pageSchema,
			await githubGraphql.query(query, { after: cursor }),
		);
		if (!result) return undefined;
		const organization: RawOrganization = result.data.organization;
		projects.push(...organization.repositories.nodes.map(projectData));
		const info: RawOrganization["repositories"]["pageInfo"] =
			organization.repositories.pageInfo;
		if (!info.hasNextPage) {
			return {
				organization: organizationData(organization),
				projects,
				members: organization.membersWithRole.nodes
					.filter((member) => publicLogins.has(member.login))
					.map(memberData),
			};
		}
		if (!info.endCursor || seen.has(info.endCursor)) return undefined;
		seen.add(info.endCursor);
		cursor = info.endCursor;
	}
	return undefined;
};

export const githubLoader = {
	name: "github-organization",
	async load({
		store,
		parseData,
	}: Parameters<Loader["load"]>[0]): Promise<void> {
		store.clear();
		const token = env.GITHUB_TOKEN;
		if (!token) return;
		const snapshot = await collect(token);
		if (!snapshot) return;

		const entry = (
			id: string,
			data: GithubData,
		): readonly [string, GithubData] => [id, data];
		const entries: readonly (readonly [string, GithubData])[] = [
			entry("organization", snapshot.organization),
			...snapshot.projects.map((project) =>
				entry(`project:${project.title}`, project),
			),
			...snapshot.members.map((member) =>
				entry(`member:${member.login}`, member),
			),
		];
		const parsed = await Promise.all(
			entries.map(async ([id, data]) => {
				return { id, data: await parseData({ id, data }) };
			}),
		);
		for (const entry of parsed) store.set(entry);
	},
} satisfies Loader;
