import { http } from "./http";

export const rest = (token: string, origin: string) => {
	const client = http(token);
	return {
		get: (path: string): Promise<unknown> => client.get(`${origin}${path}`),
	};
};
