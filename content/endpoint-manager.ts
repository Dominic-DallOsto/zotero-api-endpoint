/* eslint-disable @typescript-eslint/unbound-method */

declare const Zotero: any;
declare const ZoteroPane: any;

import { endpoint as addAttachmentFromFile} from './endpoints/add-attachment-from-file';
import { endpoint as getItemAttachments } from './endpoints/get-item-attachments';
import { endpoint as createItems} from './endpoints/create-items';
import { getAttachmentPath } from './utils';

enum HTTP_STATUS {
	OK = 200,
	SERVER_ERROR = 500,
	NOT_FOUND = 404,
	CONFLICT = 409,
	BAD_REQUEST = 400,
}

enum HTTP_METHOD {
	GET = 'GET',
	POST = 'POST',
}

enum MIME_TYPE {
	TEXT = 'text/plain',
	JSON = 'application/json'
}

type ZoteroItem = {
	[key: string]: string | object
};

type ResponseCallback = (status: HTTP_STATUS, type: MIME_TYPE, message: string) => void;

export class EndpointManager {
	private endpoints = [];

	public addEndpoints(): void {
		this.addEndpoint('/zotero-api-endpoint/get-libraries', [HTTP_METHOD.GET], getLibraries);
		this.addEndpoint('/zotero-api-endpoint/get-selection', [HTTP_METHOD.GET], getSelection);
		this.addEndpoint('/zotero-api-endpoint/search-library', [HTTP_METHOD.POST], searchLibrary);
		this.addEndpoint('/zotero-api-endpoint/create-items', [HTTP_METHOD.POST], createItems);
		this.addEndpoint('/zotero-api-endpoint/get-item-attachments', [HTTP_METHOD.POST], getItemAttachments);
		this.addEndpoint('/zotero-api-endpoint/add-attachment-from-file', [HTTP_METHOD.POST], addAttachmentFromFile);
	}

	private addEndpoint(endpointName: string, supportedMethods: HTTP_METHOD[],
		endpointFunction: (data) => Promise<any> | any) {
		this.endpoints.push(endpointName);

		// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
		Zotero.Server.Endpoints[endpointName] = function() {
			return {
				supportedMethods,
				init: async (data: any, sendResponseCallback: ResponseCallback): Promise<void> => {
					try {
						const result = await endpointFunction(data);
						sendResponseCallback(HTTP_STATUS.OK, MIME_TYPE.JSON, JSON.stringify(result));
					}
					catch (e) {
						// could return more error info with a debug switch
						const result = {
							error: e.message,
						};
						sendResponseCallback(HTTP_STATUS.SERVER_ERROR, MIME_TYPE.JSON, JSON.stringify(result));
					}
				},
			};
		};
	}

	public removeEndpoints(): void {
		this.endpoints.forEach(endpointName => {
			delete Zotero.Server.Endpoints[endpointName];
		});
	}
}


/**
 * Validates JSON POST object against a validation map of validator functions.
 * Unless the validation functions returns true, an error is thrown.
 * @param {{[key:string]:any}} args
 * @param {{[key:string]:function}} argsValidatorMap
 * @param {string?} msg Optional informational message about the required value type
 */
function validatePostData(args: { [key: string]: any },
	argsValidatorMap: { [key: string]: (val: any) => boolean },
	msg = '') {
	for (const [argName, argValidator] of Object.entries(argsValidatorMap)) {
		let errMsg: string;
		if (args[argName] === undefined) {
			errMsg = `Missing value for ${argName}`;
		}
		else {
			const result = argValidator(args[argName]);
			switch (result) {
				case true:
					continue;
				case false:
					errMsg = `Invalid value for ${argName}`;
					break;
				default:
					errMsg = result;
			}
		}
		if (msg) errMsg += `: ${msg}`;
		throw new Error(errMsg);
	}
}



interface LibrariesResponse {
	libraryID: number
	libraryType: string
	groupID: number
	groupName: string
}

/**
 * Returns an array with data on the accessible libraries, e.g.
 * ```
 * [
 *     {"libraryID":1,"libraryType":"user"},
 *     {"libraryID":12345,"libraryType":"group","groupID":987654,"groupName":"My Group"}
 * ]
 * ```
 */
function getLibraries(_: object): LibrariesResponse {
	return Zotero.Libraries.getAll().map(library => ({
		libraryID: library.libraryID,
		libraryType: library.libraryType,
		groupID: library.groupID,
		groupName: library.groupName,
	})) as LibrariesResponse;
}

interface SelectionResponse {
	libraryID: number
	groupID: number
	selectedItems: ZoteroItem[]
	collection: string
	childItems: ZoteroItem[]
}

/**
 * Returns information on the current selection in Zotero.
 */
async function getSelection(_: object): Promise<SelectionResponse> {
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
				data.filepath = await getAttachmentPath(item);
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

type SearchRequest = {
	libraryID: number
	query: object
	resultType: 'items' | 'keys' | 'hits'
};

type SearchResponse = ZoteroItem[] | string[] | string;

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
async function searchLibrary(data: SearchRequest): Promise<SearchResponse> {
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
	return items as SearchResponse;
}



const endpointManager = new EndpointManager();
endpointManager.addEndpoints();
