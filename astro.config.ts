import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import {
	transformerNotationDiff,
	transformerNotationHighlight,
	transformerNotationWordHighlight,
} from "@shikijs/transformers";
import unocss from "@unocss/astro";
import { presetTypography } from "@unocss/preset-typography";
import { presetWind4 } from "@unocss/preset-wind4";
import transformerVariantGroup from "@unocss/transformer-variant-group";
import { defineConfig, fontProviders } from "astro/config";
import { locales } from "./src/i18n";
import { diagrams, mathematics } from "./src/markdown";

const base = `${(process.env.ASTRO_BASE ?? "").replace(/\/+$/, "")}/`;

const google = (
	name: string,
	cssVariable: string,
	subsets: [string, ...string[]],
) => ({
	provider: fontProviders.google(),
	name,
	cssVariable,
	weights: ["100 900"] as [string],
	styles: ["normal"] as ["normal"],
	subsets,
	fallbacks: ["sans-serif"],
});

const fontsource = (
	name: string,
	cssVariable: string,
	fallbacks: string[],
) => ({
	provider: fontProviders.fontsource(),
	name,
	cssVariable,
	weights: [400] as [number],
	styles: ["normal"] as ["normal"],
	subsets: ["latin"] as [string],
	fallbacks,
});

export default defineConfig({
	site: process.env.SITE_URL || "https://rebis.cn",
	base,
	trailingSlash: "always",
	output: "static",
	i18n: {
		locales: [...locales],
		defaultLocale: "en-us",
		routing: { prefixDefaultLocale: true },
	},
	prefetch: { prefetchAll: true, defaultStrategy: "hover" },
	experimental: {
		clientPrerender: true,
		chromeDevtoolsWorkspace: true,
		collectionStorage: "chunked",
		incrementalBuild: true,
	},
	build: {
		inlineStylesheets: "always",
	},
	markdown: {
		processor: satteri({
			features: { math: true },
			hastPlugins: [diagrams, mathematics],
		}),
		syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid", "math"] },
		shikiConfig: {
			themes: { light: "github-light", dark: "github-dark" },
			defaultColor: false,
			transformers: [
				transformerNotationDiff(),
				transformerNotationHighlight(),
				transformerNotationWordHighlight(),
			],
		},
	},
	fonts: [
		google("Noto Sans", "--font-noto-sans", ["latin"]),
		google("Noto Sans SC", "--font-noto-sans-sc", [
			"latin",
			"chinese-simplified",
		]),
		fontsource("Maple Mono", "--font-maple-mono", ["monospace"]),
	],
	integrations: [
		mdx(),
		sitemap({
			filter: (page) => !/(?:^|\/)(?:404|500)\/?$/.test(page),
		}),
		unocss({
			presets: [
				presetWind4({ preflights: { reset: true } }),
				presetTypography(),
			],
			transformers: [transformerVariantGroup()],
		}),
	],
	vite: {
		css: {
			transformer: "lightningcss",
		},
		optimizeDeps: {
			include: ["mermaid"],
		},
	},
});
