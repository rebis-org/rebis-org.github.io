const tuple = <const Values extends readonly string[]>(...values: Values) =>
	values;

export const locales = tuple("en-us", "zh-cn");
export type Locale = (typeof locales)[number];

type Section =
	| "nav"
	| "header"
	| "section"
	| "project"
	| "toc"
	| "accessibility"
	| "error";
type Key = `${Section}.${string}`;

const en = {
	"nav.home": "Home",
	"nav.about": "About",
	"nav.projects": "Projects",
	"nav.blog": "Blog",
	"header.about": "Γνῶθι σεαυτόν",
	"header.about.citation": "Delphic maxim",
	"header.projects": "Talk is cheap. Show me the code.",
	"header.projects.author": "Linus Torvalds",
	"header.blog": "Colorless green ideas sleep furiously.",
	"header.blog.author": "Chomsky, Noam. ",
	"header.blog.title": "Syntactic Structures",
	"header.blog.publisher": ". Mouton, 1957.",
	"section.name": "Name",
	"section.members": "Members",
	"section.connect": "Connect",
	"project.language": "Language",
	"project.license": "License",
	"project.forks": "Forks",
	"project.stars": "Stars",
	"project.issues": "Issues",
	"project.pullRequests": "Pull requests",
	"project.updated": "Updated",
	"toc.title": "Contents",
	"accessibility.skipToMain": "Skip to main content",
	"accessibility.switchToLight": "Switch to light mode",
	"accessibility.switchToDark": "Switch to dark mode",
	"error.404.title": "404",
	"error.404.subtitle": "Not Found",
	"error.404.message": "The requested resource does not exist at this URI.",
	"error.500.title": "500",
	"error.500.subtitle": "Internal Server Error",
	"error.500.message":
		"The server encountered an unexpected condition that prevented it from fulfilling the request.",
	"error.home": "Back to home",
} satisfies Record<Key, string>;

export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;

const catalog: Record<Locale, Dictionary> = {
	"en-us": en,
	"zh-cn": {
		"nav.home": "首页",
		"nav.about": "关于",
		"nav.projects": "项目",
		"nav.blog": "文章",
		"header.about": "Γνῶθι σεαυτόν",
		"header.about.citation": "Delphi劝言",
		"header.projects": "Talk is cheap. Show me the code.",
		"header.projects.author": "Linus Torvalds",
		"header.blog": "Colorless green ideas sleep furiously.",
		"header.blog.author": "Chomsky, Noam. ",
		"header.blog.title": "Syntactic Structures",
		"header.blog.publisher": ". Mouton, 1957.",
		"section.name": "名称",
		"section.members": "成员",
		"section.connect": "联系",
		"project.language": "语言",
		"project.license": "许可证",
		"project.forks": "分支",
		"project.stars": "星标",
		"project.issues": "议题",
		"project.pullRequests": "拉取请求",
		"project.updated": "更新",
		"toc.title": "目录",
		"accessibility.skipToMain": "跳至主要内容",
		"accessibility.switchToLight": "切换到浅色模式",
		"accessibility.switchToDark": "切换到深色模式",
		"error.404.title": "404",
		"error.404.subtitle": "未找到",
		"error.404.message": "您所请求的资源在该 URI 之下不存在。",
		"error.500.title": "500",
		"error.500.subtitle": "服务器内部错误",
		"error.500.message": "服务器遇到意外状况，未能完成该请求。",
		"error.home": "返回首页",
	},
} satisfies Record<Locale, Dictionary>;

export const translate = (locale: Locale, key: TranslationKey): string =>
	catalog[locale][key];

export const formatDate = (locale: Locale, value: Date | string): string =>
	new Intl.DateTimeFormat(locale === "zh-cn" ? "zh-CN" : "en-US", {
		dateStyle: "medium",
	}).format(new Date(value));
