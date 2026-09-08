import type { Linter } from "eslint";
import eslintPluginAstro from "eslint-plugin-astro";

export default [
	{
		ignores: ["dist/", "vendor/", ".astro/"],
	},
	...eslintPluginAstro.configs.recommended,
] satisfies Linter.Config[];
