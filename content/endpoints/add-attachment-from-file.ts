declare const Zotero: any;

import {Zotero as ZoteroModel} from '../zotero-datamodel';

type integer = number;

export interface RequestType {
	libraryID: integer
	file: string
	fileBaseName: string
	parentItemID: integer|string
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
