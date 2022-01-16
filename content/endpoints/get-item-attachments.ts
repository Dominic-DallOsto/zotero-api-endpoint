declare const Zotero: any;

import {Zotero as ZoteroModel} from '../zotero-datamodel';
import { getAttachmentPath } from '../utils';

export interface RequestType {
	libraryID: number
	keys: string[]
}

export type ResponseType = {
	[key: string]: ZoteroModel.Item.Any & {
		filepath?: string
	}
};

/**
 * Return the item data of the attachments of items identified by their key, with the
 * absolute path to the stored attachment files added, so that citation-mining software can extract
 * reference data from them.
 * Expects POST data containing an object with properties `libraryID` and `keys`. Returns  a map of
 * keys and attachment item data.
 */
export async function endpoint(data: RequestType): Promise<ResponseType> {
	const {libraryID, keys} = data;
	const attachmentsMap: ResponseType = {};
	for (const key of keys) {
		const item = await Zotero.Items.getByLibraryAndKeyAsync(libraryID, key);
		if (!item) {
			throw new Error(`No item with key ${key} exists.`);
		}
		attachmentsMap[key] = item.getAttachments().map(async id => {
			const attachment = Zotero.Items.get(id);
			const result = attachment.toJSON();
			if (attachment.isFileAttachment()) {
				result.filepath = await getAttachmentPath(item);
			}
			return result as string;
		});
	}
	return attachmentsMap;
}
