const json = async (url: string, init: RequestInit): Promise<unknown> => {
	const response = await fetch(url, init);
	if (!response.ok) return undefined;
	const value: unknown = await response.json();
	return value;
};

export const http = (token: string) => {
	const authorization = { Authorization: `Bearer ${token}` };
	return {
		get: (url: string): Promise<unknown> =>
			json(url, { headers: authorization }),
		post: (url: string, body: unknown): Promise<unknown> =>
			json(url, {
				method: "POST",
				headers: { ...authorization, "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
	};
};
