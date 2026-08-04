import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
	const origin = site ?? new URL("https://rebis-org.github.io");
	const body =
		`User-agent: *\n` +
		`Allow: /\n\n` +
		`Sitemap: ${new URL("sitemap-index.xml", origin).href}\n`;
	return new Response(body, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
