declare const Zotero: any;

import {validatePostData} from '../utils';
import {Zotero as ZoteroModel} from '../zotero-datamodel';

type ZoteroItem = ZoteroModel.Item.Any;
type integer = number;

export interface RequestType {
	libraryID: integer
	query: object
	resultType: 'items' | 'keys' | 'hits'
}

export type ResponseType = ZoteroItem[] | string[] | string;

/**
 * Searches a given library with a set of given conditions (see
 * https://www.zotero.org/support/dev/client_coding/javascript_api#executing_the_search) so that
 * an external program can check whether citing or cited references exist or need to be created.
 * Depending on `resultType` return either an array of "items" matching the query,
 * an array of item "keys" or the number of "hits".
 * Example POST data:
 * ```
 * {
 * 	    "libraryID": 1,
 * 	    "query": {
 * 		    "date": ["is", "2019"],
 * 		    "title": ["contains", "zotero"]
 * 	    },
 * 	    "resultType": "items"
 * }
 * ```
 */
export async function endpoint(data: RequestType): Promise<ResponseType> {
	validatePostData(data, {
		libraryID: val => typeof val == 'number' && Number.isInteger(val),
		query: val => typeof val === 'object' && Object.entries(val as object).length > 0,
		resultType: val => typeof val === 'string' && ['items', 'keys', 'hits'].includes(val),
	}, "libraryID (int), query (object), resultType ('items|keys|hits')");
	const {libraryID, query, resultType} = data;
	const search = new Zotero.Search();
	search.libraryID = libraryID;
	for (let [field, conditions] of Object.entries(query)) {
		if (!Array.isArray(conditions)) {
			conditions = [conditions];
		}
		conditions.unshift(field);
		search.addCondition(...conditions);
	}
	const results = await search.search();
	if (resultType === 'hits') {
		return String(results.length);
	}
	let items = await Zotero.Items.getAsync(results);
	if (resultType === 'keys') {
		items = items.map(item => item.key as string);
	}
	return items as ResponseType;
}

