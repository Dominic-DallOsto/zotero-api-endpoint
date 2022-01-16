declare const Zotero: any;

export interface ResponseType {
	libraryID: number
	libraryType: string
	groupID: number
	groupName: string
}

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
