declare const Zotero: any;

import {Zotero as ZoteroModel} from '../zotero-datamodel';
type integer = number;

export interface RequestType {
	libraryID: integer
	items: object[]
}

export type ResponseType = string;

/**
 * Updates or more items in the given library.
 * Expects JSON POST data containing an object with the following properties:
 * `libraryID`: the integer id of the library; `collections`: null if no collection,
 * or an array of collection keys which will be added to each newly created
 * entry; `items`: An array of zotero json item data
 */
export async function endpoint(data: RequestType): Promise<ResponseType> {
	const {libraryID, items} = data;
	for (const itemData of items as ZoteroModel.Item.Any[]) {
		const item = await Zotero.Items.getByLibraryAndKeyAsync(libraryID, itemData.key);
		if (!item) {
			throw new Error(`An item with key ${itemData.key} does not exist in this library.`);
		}
		for (const [key, value] of Object.entries(itemData)) {
			switch (key) {
				case 'itemType':
				case 'key':
				case 'version':
					// ignore
					break;
				case 'creators':
					item.setCreators(value);
					break;
				case 'tags':
					item.setTags(value);
					break;
				case 'collections':
					item.setCollections(value);
					break;
				case 'relations':
					item.setRelations(value);
					break;
				default:
					item.setField(key, value);
			}
		}
		await item.saveTx();
	}
	return 'OK';
}

