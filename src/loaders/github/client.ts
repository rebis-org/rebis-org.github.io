const json = async (url: string, init: RequestInit): Promise<unknown> => {
	const response = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(30_000),
	});
	if (!response.ok)
		throw new Error(
			`GitHub API request failed with ${response.status} for ${url}`,
		);
	return (await response.json()) as unknown;
};

export const client = (token: string, origin: string) => {
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
		query: (
			query: string,
			variables: Readonly<Record<string, unknown>> = {},
		): Promise<unknown> => post(`${origin}/graphql`, { query, variables }),
	};
};
