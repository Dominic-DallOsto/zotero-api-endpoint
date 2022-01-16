declare const Zotero: any;
type integer = number;

export interface ResponseType {
	libraryID: integer
	libraryType: string
	groupID: integer
	groupName: string
}

export type RequestType = null;

/**
 * Returns an array with data on the accessible libraries, e.g.
 * ```
 * [
 *     {"libraryID":1,"libraryType":"user"},
 *     {"libraryID":12345,"libraryType":"group","groupID":987654,"groupName":"My Group"}
 * ]
 * ```
 */
export function endpoint(_: object): ResponseType {
	return Zotero.Libraries.getAll().map(library => ({
		libraryID: library.libraryID,
		libraryType: library.libraryType,
		groupID: library.groupID,
		groupName: library.groupName,
	})) as ResponseType;
}
