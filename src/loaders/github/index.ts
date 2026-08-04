import type { Loader } from "astro/loaders";
import { z } from "astro/zod";
import { env } from "node:process";
import { graphql } from "./graphql";
import { rest } from "./rest";

const login = "rebis-org";
const graphqlBase = "https://api.github.com/graphql";
const restBase = "https://api.github.com";
const maxPages = 100;
const publicMembersEndpoint = `/orgs/${login}/public_members?per_page=100`;

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

const nonempty = z.string().trim().min(1);

const publicMembersSchema = z.array(z.object({ login: nonempty }));

const memberSchema = z.object({
	login: nonempty,
	name: z.string().nullish(),
	avatarUrl: nonempty,
	url: nonempty,
});

const repositorySchema = z.object({
	name: nonempty,
	description: z.string().nullish(),
	url: nonempty,
	updatedAt: nonempty,
	forkCount: z.number().int().nonnegative(),
	stargazerCount: z.number().int().nonnegative(),
	primaryLanguage: z.object({ name: nonempty }).nullish(),
	licenseInfo: z.object({ spdxId: nonempty }).nullish(),
	issues: z.object({ totalCount: z.number().int().nonnegative() }),
	pullRequests: z.object({ totalCount: z.number().int().nonnegative() }),
});

const pageSchema = z.object({
	data: z.object({
		organization: z.object({
			name: nonempty,
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
type Organization = z.infer<typeof pageSchema>["data"]["organization"];
type Repository = z.infer<typeof repositorySchema>;
type Member = z.infer<typeof memberSchema>;

type OrganizationData = Readonly<{
	type: "organization";
	name: string;
	email: string | null;
}>;
type ProjectData = Readonly<{
	type: "project";
	title: string;
	description?: string;
	url: string;
	language?: string;
	license?: string;
	forks: number;
	stars: number;
	issues: number;
	pullRequests: number;
	updatedAt: string;
}>;
type MemberData = Readonly<{
	type: "member";
	login: string;
	name: string;
	avatarUrl: string;
	url: string;
}>;

const organizationData = (organization: Organization): OrganizationData => ({
	type: "organization",
	name: organization.name,
	email: organization.email ?? null,
});

const projectData = (repository: Repository): ProjectData => ({
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

const memberData = (member: Member): MemberData => ({
	type: "member",
	login: member.login,
	name: member.name ?? member.login,
	avatarUrl: member.avatarUrl,
	url: member.url,
});

const parse = <Schema extends z.ZodType>(
	schema: Schema,
	data: unknown,
): z.infer<Schema> | undefined => {
	const result = schema.safeParse(data);
	return result.success ? result.data : undefined;
};

class Pages {
	#cursor: string | null = null;
	#seen = new Set<string>();

	get cursor(): string | null {
		return this.#cursor;
	}

	advance(
		info: Page["data"]["organization"]["repositories"]["pageInfo"],
	): boolean {
		if (!info.hasNextPage) {
			this.#cursor = null;
			return true;
		}
		if (!info.endCursor || this.#seen.has(info.endCursor)) return false;
		this.#seen.add(info.endCursor);
		this.#cursor = info.endCursor;
		return true;
	}
}

const collect = async (
	token: string,
): Promise<
	| {
			organization: OrganizationData;
			projects: readonly ProjectData[];
			members: readonly MemberData[];
	  }
	| undefined
> => {
	const githubRest = rest(token, restBase);
	const githubGraphql = graphql(token, graphqlBase);
	const publicMembers = parse(
		publicMembersSchema,
		await githubRest.get(publicMembersEndpoint),
	);
	if (!publicMembers) return undefined;
	const publicLogins = new Set(publicMembers.map(({ login }) => login));
	const pages = new Pages();
	const projects: ProjectData[] = [];
	const members: MemberData[] = [];
	for (let remaining = maxPages; remaining > 0; remaining -= 1) {
		const parsed = parse(
			pageSchema,
			await githubGraphql.query(query, { after: pages.cursor }),
		);
		if (!parsed) return undefined;
		const organization = parsed.data.organization;
		projects.push(...organization.repositories.nodes.map(projectData));
		if (pages.cursor === null) {
			members.push(
				...organization.membersWithRole.nodes
					.map(memberData)
					.filter((member) => publicLogins.has(member.login)),
			);
		}
		if (!pages.advance(organization.repositories.pageInfo)) return undefined;
		if (pages.cursor === null) {
			return {
				organization: organizationData(organization),
				projects,
				members,
			};
		}
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
		const data = await collect(token);
		if (!data) return;
		const set = async (
			id: string,
			value: OrganizationData | ProjectData | MemberData,
		): Promise<void> => {
			store.set({ id, data: await parseData({ id, data: value }) });
		};
		for (const project of data.projects) {
			await set(`project:${project.title}`, project);
		}
		for (const member of data.members) {
			await set(`member:${member.login}`, member);
		}
		await set("organization", data.organization);
	},
} satisfies Loader;
