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

export default defineConfig({
	site: process.env.SITE_URL || "https://rebis-org.github.io",
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
		{
			provider: fontProviders.google(),
			name: "Noto Sans",
			cssVariable: "--font-noto-sans",
			weights: ["100 900"],
			styles: ["normal"],
			subsets: ["latin"],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Noto Sans SC",
			cssVariable: "--font-noto-sans-sc",
			weights: ["100 900"],
			styles: ["normal"],
			subsets: ["latin", "chinese-simplified"],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.fontsource(),
			name: "Maple Mono",
			cssVariable: "--font-maple-mono",
			weights: [400],
			styles: ["normal"],
			subsets: ["latin"],
			fallbacks: ["monospace"],
		},
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
