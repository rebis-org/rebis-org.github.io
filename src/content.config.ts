import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { githubLoader } from "./loaders/github";

const text = z.string().trim().min(1);
const count = z.number().int().nonnegative();

export const collections = {
	posts: defineCollection({
		loader: glob({ base: "./src/posts", pattern: "**/[^_]*.{md,mdx}" }),
		schema: z
			.object({
				title: text,
				pubDate: z.date(),
				locale: z.enum(["en-us", "zh-cn"]).optional(),
				description: text.optional(),
				author: text.optional(),
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
					description: text.optional(),
					url: z.url(),
					language: text.optional(),
					license: text.optional(),
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
