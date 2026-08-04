import { env } from "node:process";
import type { Loader } from "astro/loaders";
import { z } from "astro/zod";
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

const text = z.string().trim().min(1);
const count = z.number().int().nonnegative();
const memberIdentitySchema = z.object({ login: text });
const publicMembersSchema = z.array(memberIdentitySchema);
const memberSchema = memberIdentitySchema.extend({
	name: z.string().nullish(),
	avatarUrl: z.url(),
	url: z.url(),
});
const repositorySchema = z.object({
	name: text,
	description: z.string().nullish(),
	url: z.url(),
	updatedAt: z.iso.datetime(),
	forkCount: count,
	stargazerCount: count,
	primaryLanguage: z.object({ name: text }).nullish(),
	licenseInfo: z.object({ spdxId: text }).nullish(),
	issues: z.object({ totalCount: count }),
	pullRequests: z.object({ totalCount: count }),
});
const pageSchema = z.object({
	data: z.object({
		organization: z.object({
			name: text,
			email: z.email().nullish(),
			membersWithRole: z.object({ nodes: z.array(memberSchema) }),
			repositories: z.object({
				nodes: z.array(repositorySchema),
				pageInfo: z.object({
					hasNextPage: z.boolean(),
					endCursor: z.string().nullish(),
				}),
			}),
		}),
	}),
});

type Page = z.infer<typeof pageSchema>;
type RawOrganization = Page["data"]["organization"];
type RawRepository = z.infer<typeof repositorySchema>;
type RawMember = z.infer<typeof memberSchema>;
type GithubData = Organization | Project | Member;

const parse = <Schema extends z.ZodType>(
	schema: Schema,
	value: unknown,
): z.infer<Schema> | undefined => {
	const result = schema.safeParse(value);
	return result.success ? result.data : undefined;
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
