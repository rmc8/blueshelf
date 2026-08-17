declare module 'isbn3' {
	export interface IsbnData {
		group?: string;
		publisher?: string;
		article?: string;
		check?: string;
		source: string;
		prefix?: string;
		isIsbn13: boolean;
		isIsbn10: boolean;
		groupname?: string;
		check10?: string;
		check13?: string;
		isbn13?: string;
		isbn13h?: string;
		isbn10?: string;
		isbn10h?: string;
		isValid: boolean;
	}

	export function parse(rawIsbn: string): IsbnData | null;
	export function asIsbn13(rawIsbn: string, hyphenated?: boolean): string | null;
	export function asIsbn10(rawIsbn: string, hyphenated?: boolean): string | null;
	export function hyphenate(rawIsbn: string): string | null;
	export function audit(rawIsbn: string): { valid: boolean; message?: string };
}
