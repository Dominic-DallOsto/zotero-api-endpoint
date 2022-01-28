declare const Zotero: any;

type integer = number;

interface ItemUpdateData {
	key: string,
	creators?: { creatorType: string, name?: string, firstName?: string, lastName?: string }[],
	tags?: string[],
	collections?: string[],
	relations?: Record<'owl:sameAs' | 'dc:replaces' | 'dc:relation', string>,
	[key:string]:any
}

export interface RequestType {
	libraryID: integer
	items: ItemUpdateData[] // cannot be Zotero.Item.Any because item data can be incomplete
}

export type ResponseType = string;

/**
 * Updates or more items in the given library.
 * Expects JSON POST data containing an object with the following properties:
 * `libraryID`: the integer id of the library; `items`: An array of zotero json item data
 */
export async function endpoint(data: RequestType): Promise<ResponseType> {
	const {libraryID, items} = data;
	for (const itemData of items) {
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
	return `Updated ${items.length} items`;
}

