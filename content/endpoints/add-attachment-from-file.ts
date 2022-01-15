// the Zotero app, no typings are available
declare const Zotero: any;

// the Zotero data model
import {Zotero as ZoteroItems} from '../zotero-datamodel';

export interface RequestType {
	libraryID: number
	filepath: string
	fileBaseName: string
	parentItemID: number
	collection: string|null
	collections: string[] | undefined
}

export type ResponseType = ZoteroItems.Item.Any;

/**
 * Adds an attachment item to a parent item by its local file path.
 * Exposes Zotero.Attachments.importFromFile
 */
export async function endpoint(data: RequestType): Promise<ResponseType> {
	if (data.collection) {
		data.collections = [data.collection];
	}
	return await Zotero.Attachments.importFromFile(data) as ResponseType;
}
