import { http } from "./http";

export const graphql = (token: string, endpoint: string) => {
	const client = http(token);
	return {
		query: (
			query: string,
			variables?: Record<string, unknown>,
		): Promise<unknown> => client.post(endpoint, { query, variables }),
	};
};
