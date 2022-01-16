// the Zotero app, no typings are available
declare const Zotero: any;

// the Zotero data model
import {Zotero as ZoteroModel} from '../zotero-datamodel';

export interface RequestType {
	libraryID: number
	file: string
	fileBaseName: string
	parentItemID: number|string
	collection: string|null
	collections?: string[]
	title?: string
	contentType?: string
	charset?: string
	saveOptions?: object
}

export type ResponseType = ZoteroModel.Item.Any;

/**
 * Adds an attachment item to a parent item by its local file path.
 * Exposes Zotero.Attachments.importFromFile()
 */
export async function endpoint(data: RequestType): Promise<ResponseType> {
	if (data.collection) {
		data.collections = [data.collection];
	}
	return await Zotero.Attachments.importFromFile(data) as ResponseType;
}
