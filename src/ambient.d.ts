declare module '@std/http/file-server' {
	export interface ServeDirOptions {
		fsRoot?: string;
		urlRoot?: string;
		showIndex?: boolean;
		showDotfiles?: boolean;
		enableCors?: boolean;
		quiet?: boolean;
	}
	export function serveDir(req: Request, opts?: ServeDirOptions): Promise<Response>;
}

declare module 'jsr:@std/http@^1.0.0/file-server' {
	export interface ServeDirOptions {
		fsRoot?: string;
		urlRoot?: string;
		showIndex?: boolean;
		showDotfiles?: boolean;
		enableCors?: boolean;
		quiet?: boolean;
	}
	export function serveDir(req: Request, opts?: ServeDirOptions): Promise<Response>;
}
