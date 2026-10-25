import { defineCollection } from "astro:content";
import { githubLoader } from "./loaders/github";
import { glob } from "astro/loaders";
import { locales } from "./i18n";
import { z } from "astro/zod";

const text = z.string().trim().min(1);
const count = z.number().int().nonnegative();
const optionalText = text.optional();
const httpsUrl = z
	.url()
	.refine((value) => value.startsWith("https://"), "expected an https URL");

const organizationSchema = z
	.object({
		type: z.literal("organization"),
		name: text,
		email: z.email().nullable(),
	})
	.strict();
const projectSchema = z
	.object({
		type: z.literal("project"),
		title: text,
		description: optionalText,
		url: httpsUrl,
		language: optionalText,
		license: optionalText,
		forks: count,
		stars: count,
		issues: count,
		pullRequests: count,
		updatedAt: z.iso.datetime(),
	})
	.strict();
const memberSchema = z
	.object({
		type: z.literal("member"),
		login: text,
		name: text,
		avatarUrl: httpsUrl,
		url: httpsUrl,
	})
	.strict();

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
				sealed: z.boolean().optional(),
			})
			.strict(),
	}),
	github: defineCollection({
		loader: githubLoader,
		schema: z.discriminatedUnion("type", [
			organizationSchema,
			projectSchema,
			memberSchema,
		]),
	}),
};
