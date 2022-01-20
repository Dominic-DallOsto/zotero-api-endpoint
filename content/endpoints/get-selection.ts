declare const ZoteroPane: any;

import {Zotero as ZoteroModel} from '../zotero-datamodel';
import {getAttachmentPath} from '../utils';

type ZoteroItem = ZoteroModel.Item.Any;
type integer = number;

export interface ResponseType {
	libraryID: integer
	groupID: integer
	selectedItems: ZoteroItem[]
	collection: string
	childItems: ZoteroItem[]
}

export type RequestType = null;

/**
 * Returns information on the current selection in Zotero.
 */
export async function endpoint(_: object): Promise<ResponseType> {
	let selectedItems = ZoteroPane.getSelectedItems();
	const collection = ZoteroPane.getSelectedCollection() || null;
	const childItems = collection && selectedItems.length === 0 ? collection.getChildItems() : [];
	let libraryID = null;
	let groupID = null;
	if (selectedItems.length) {
		libraryID = selectedItems[0].library.libraryID;
		groupID = selectedItems[0].library.groupID;
		const tmp: ZoteroItem[] = [];
		for (const item of selectedItems) {
			const data = item.toJSON();
			if (item.isFileAttachment()) {
				data.filepath = await getAttachmentPath(item as {getFilePath: () => string});
			}
			tmp.push(data as ZoteroItem);
		}
		selectedItems = tmp;
	}
	else if (collection) {
		libraryID = collection.library.libraryID;
		groupID = collection.library.groupID;
	}
	return {
		libraryID,
		groupID,
		selectedItems,
		collection,
		childItems,
	};
}
