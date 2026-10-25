const TIMEOUT_MS = 30_000;

const json = async (url: string, init: RequestInit): Promise<unknown> => {
	const response = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!response.ok) {
		throw new Error(
			`GitHub API request failed with ${response.status} for ${url}`,
		);
	}
	return (await response.json()) as unknown;
};

export type GithubClient = Readonly<{
	get: (path: string) => Promise<unknown>;
	query: (
		query: string,
		variables?: Readonly<Record<string, unknown>>,
	) => Promise<unknown>;
}>;

export const client = (token: string, origin: string): GithubClient => {
	const authorization = { Authorization: `Bearer ${token}` };
	const post = (url: string, body: unknown): Promise<unknown> =>
		json(url, {
			method: "POST",
			headers: { ...authorization, "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	const get = (path: string): Promise<unknown> =>
		json(`${origin}${path}`, { headers: authorization });
	return {
		get,
		query: (query, variables = {}): Promise<unknown> =>
			post(`${origin}/graphql`, { query, variables }),
	};
};
