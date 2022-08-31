declare const Zotero: any;
import {Zotero as ZoteroModel} from '../zotero-datamodel';

type ZoteroItem = ZoteroModel.Item.Any;
type integer = number;

export interface RequestType {
	libraryID: integer
	keys: string[]
}

export type ResponseType = ZoteroItem[];

/**
 * Returns an array with the requested items
 */
export async function endpoint(data: RequestType): Promise<ResponseType> {
	const {libraryID, keys} = data;
	const response: ResponseType = [];
	for (const key of keys) {
		const item = await Zotero.Items.getByLibraryAndKeyAsync(libraryID, key) as ZoteroItem;
		if (!item) {
			throw new Error(`No item with key ${key} exists.`);
		}
		response.push(item);
	}
	return response;
}
