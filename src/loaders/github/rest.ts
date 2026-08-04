import { http } from "./http";

export const rest = (token: string, baseUrl: string) => {
	const client = http(token);
	return {
		get: (path: string): Promise<unknown> => client.get(`${baseUrl}${path}`),
	};
};
