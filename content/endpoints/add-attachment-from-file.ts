// unfortunately, no typings exist
declare const Zotero: any;

// todo have a real type, see https://github.com/retorquere/zotero-sync/blob/main/typings/zotero.d.ts
type ZoteroItem = {
	[key: string]: string | object
};

export interface RequestType {
	libraryID: number
	filepath: string
	fileBaseName: string
	parentItemID: number
	collection: string|null
	collections: string[] | undefined
}

export type ResponseType = ZoteroItem;

/**
 * Adds an attachment item to a parent item by its local file path.
 * Exposes Zotero.Attachments.importFromFile
 */
export async function endpoint(data: RequestType): Promise<ZoteroItem> {
	// todo: validation from the RequestType
	if (data.collection) {
		data.collections = [data.collection];
	}
	return await Zotero.Attachments.importFromFile(data) as ZoteroItem;
}
