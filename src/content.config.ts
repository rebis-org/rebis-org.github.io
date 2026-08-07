import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { locales } from "./i18n";
import { githubLoader } from "./loaders/github";

const text = z.string().trim().min(1);
const count = z.number().int().nonnegative();
const optionalText = text.optional();

export const collections = {
	posts: defineCollection({
		loader: glob({
			base: "./src/posts",
			pattern: "**/[^_]*.{md,mdx}",
			deferRender: true,
		}),
		schema: z
			.object({
				title: text,
				pubDate: z.date(),
				locale: z.enum(locales).optional(),
				description: optionalText,
				author: optionalText,
			})
			.strict(),
	}),
	github: defineCollection({
		loader: githubLoader,
		schema: z.discriminatedUnion("type", [
			z
				.object({
					type: z.literal("organization"),
					name: text,
					email: z.email().nullable(),
				})
				.strict(),
			z
				.object({
					type: z.literal("project"),
					title: text,
					description: optionalText,
					url: z.url(),
					language: optionalText,
					license: optionalText,
					forks: count,
					stars: count,
					issues: count,
					pullRequests: count,
					updatedAt: z.iso.datetime(),
				})
				.strict(),
			z
				.object({
					type: z.literal("member"),
					login: text,
					name: text,
					avatarUrl: z.url(),
					url: z.url(),
				})
				.strict(),
		]),
	}),
};
