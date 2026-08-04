import type { APIRoute } from "astro";
import { absolute, path } from "../link";

export const GET: APIRoute = ({ site }) => {
	const origin = site ?? new URL("https://rebis-org.github.io");
	const body = [
		"User-agent: *",
		"Allow: /",
		"",
		`Sitemap: ${absolute(path("/sitemap-index.xml"), origin)}`,
		"",
	].join("\n");
	return new Response(body, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
