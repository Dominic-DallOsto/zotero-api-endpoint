declare const Zotero: any;

import {Zotero as ZoteroModel} from '../zotero-datamodel';

type integer = number;

interface BaseRequestType {
	libraryID: integer
	file: string
	fileBaseName: string
	collection: string|null
	collections?: string[]
	title?: string
	contentType?: string
	charset?: string
	saveOptions?: object
}

interface RequestTypeWithKey extends BaseRequestType {
	parentItemKey: string
}

interface RequestTypeWithID extends BaseRequestType {
	parentItemID: number
}

export type RequestType = RequestTypeWithID | RequestTypeWithKey;

export type ResponseType = ZoteroModel.Item.Any;

/**
 * Adds an attachment item to a parent item by its local file path.
 * Exposes Zotero.Attachments.importFromFile()
 */
export async function endpoint(data: RequestType): Promise<ResponseType> {
	if (data.collection) {
		data.collections = [data.collection];
	}
	let dataWithID: RequestTypeWithID;
	const parentItemKey: string | undefined = (data as RequestTypeWithKey).parentItemKey;
	if (parentItemKey) {
		const parentItemID = Zotero.Items.getIDFromLibraryAndKey(data.libraryID, parentItemKey);
		dataWithID = Object.assign(data, {parentItemID});
	}
	else {
		dataWithID = data as RequestTypeWithID;
	}
	return await Zotero.Attachments.importFromFile(dataWithID) as ResponseType;
}
