const fetchJson = async (url: string, init: RequestInit): Promise<unknown> => {
	const response = await fetch(url, init);
	if (!response.ok) return undefined;
	const body: unknown = await response.json();
	return body;
};

export const http = (token: string) => {
	const headers: HeadersInit = { Authorization: `Bearer ${token}` };
	return {
		get: (url: string): Promise<unknown> => fetchJson(url, { headers }),
		post: (url: string, data: unknown): Promise<unknown> =>
			fetchJson(url, {
				method: "POST",
				headers: { ...headers, "Content-Type": "application/json" },
				body: JSON.stringify(data),
			}),
	};
};
