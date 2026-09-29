/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module "emdash/ui" {
	export const Image: any;
	export const Media: any;
	export const PortableText: any;
	export const Blocks: any;
	export const WidgetArea: any;
	export const emdashComponents: any;
	export const EmDashHead: any;
	export const EmDashBodyStart: any;
	export const EmDashBodyEnd: any;
	export type PortableTextBlock = import("emdash").PortableTextBlock;
}

declare module "emdash/ui/comments" {
	export const Comments: any;
	export const CommentForm: any;
}

declare module "emdash/ui/search" {
	const LiveSearch: any;
	export default LiveSearch;
}
