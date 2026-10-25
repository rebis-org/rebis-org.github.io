import { absolute, path } from "../link";
import type { APIRoute } from "astro";
import { originOf } from "../site";

export const GET: APIRoute = ({ site }) => {
	const origin = originOf(site);
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
