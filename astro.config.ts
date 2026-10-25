import { defineConfig, fontProviders } from "astro/config";
import { diagrams, mathematics } from "./src/markdown";
import {
	transformerNotationDiff,
	transformerNotationHighlight,
	transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { locales } from "./src/i18n";
import mdx from "@astrojs/mdx";
import { presetTypography } from "@unocss/preset-typography";
import { presetWind4 } from "@unocss/preset-wind4";
import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import transformerVariantGroup from "@unocss/transformer-variant-group";
import unocss from "@unocss/astro";

const base = `${(process.env.ASTRO_BASE ?? "").replace(/\/+$/u, "")}/`;

interface FontDefinition {
	provider:
		| ReturnType<typeof fontProviders.google>
		| ReturnType<typeof fontProviders.fontsource>;
	name: string;
	cssVariable: string;
	weights: [string | number, ...(string | number)[]];
	styles: ["normal"];
	subsets: [string, ...string[]];
	fallbacks: string[];
}

const google = (
	name: string,
	cssVariable: string,
	subsets: [string, ...string[]],
): FontDefinition => ({
	provider: fontProviders.google(),
	name,
	cssVariable,
	weights: ["100 900"],
	styles: ["normal"],
	subsets,
	fallbacks: ["sans-serif"],
});

const MONO_WEIGHT = 400;

const fontsource = (
	name: string,
	cssVariable: string,
	fallbacks: string[],
): FontDefinition => ({
	provider: fontProviders.fontsource(),
	name,
	cssVariable,
	weights: [MONO_WEIGHT],
	styles: ["normal"],
	subsets: ["latin"],
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
			filter: (page) => !/(?:^|\/)(?:404|500)\/?$/u.test(page),
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
