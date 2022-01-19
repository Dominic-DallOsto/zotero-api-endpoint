declare const Zotero: any;

import {Zotero as ZoteroModel} from '../zotero-datamodel';
type integer = number;

export interface RequestType {
	libraryID: integer
	collections: null|string[]
	items: object[] | string
}

export type ResponseType = string[];

/**
 * Create or more items in the given library which can later be linked.
 * Expects JSON POST data containing an object with the following properties:
 * `libraryID`: the integer id of the library; `collections`: null if no collection,
 * or an array of collection keys which will be added to each newly created
 * entry; `items`: Either an array of zotero json item data or a string containing one
 * or more items in a format that can be recognized and translated by Zotero.
 * Returns the keys of the created items
 */
export async function endpoint(data: RequestType): Promise<ResponseType> {
	const {libraryID, collections, items} = data;
	let zoteroItems: ZoteroModel.Item.Any[];
	if (items[0] && typeof items[0] == 'object' && 'itemType' in items[0]) {
		// items in Zotero-JSON
		const itemIds = [];
		for (const itemData of items as { itemType: string }[]) {
			const item = new Zotero.Item(itemData.itemType);
			item.libraryID = libraryID;
			for (let [key, value] of Object.entries(itemData)) {
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
						if (collections) {
							// if collection id is given, add to existing ones
							// fix: is this a string or an array of strings?
							value = value.concat(collections[0]);
						}
						item.setCollections(value);
						break;
					case 'relations':
						item.setRelations(value);
						break;
					default:
						item.setField(key, value);
				}
			}
			const itemID = await item.saveTx();
			itemIds.push(itemID);
		}
		zoteroItems = await Zotero.Items.getAsync(itemIds);
	}
	else if (typeof items == 'string') {
		// Import items via translators
		// adapted from https://github.com/zotero/zotero/blob/master/chrome/content/zotero/xpcom/connector/server_connector.js#L1416
		await Zotero.Schema.schemaUpdatePromise;
		const translate = new Zotero.Translate.Import();
		translate.setString(items);
		const translators = await translate.getTranslators();
		if (!translators || !translators.length) {
			throw new Error('No translator could be found for input data.');
		}
		translate.setTranslator(translators[0]);
		zoteroItems = await translate.translate({
			libraryID,
			collections,
			forceTagType: 1,
			// Import translation skips selection by default, so force it to occur
			saveOptions: {
				skipSelect: false,
			},
		});
	}
	else {
		throw new Error('Invalid items data');
	}
	return zoteroItems.map(item => item.key );
}

