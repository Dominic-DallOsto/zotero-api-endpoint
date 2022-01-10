/* eslint-disable @typescript-eslint/unbound-method */
declare const Zotero: any;
declare const ZoteroPane: any;

enum HTTP_STATUS{
	OK				= 200,
	SERVER_ERROR	= 500,
	NOT_FOUND		= 404,
	CONFLICT		= 409,
	BAD_REQUEST		= 400,
}

enum HTTP_METHOD {
	GET = 'GET',
	POST = 'POST',
}

export class EndpointManager{
	private endpoints = [];

	public addEndpoints():void{
		this.addEndpoint('/zotero-api-endpoint/get-libraries', [HTTP_METHOD.GET], getLibraries);
		this.addEndpoint('/zotero-api-endpoint/get-selection', [HTTP_METHOD.GET], getSelection);
		this.addEndpoint('/zotero-api-endpoint/search-library', [HTTP_METHOD.POST], searchLibrary);
		this.addEndpoint('/zotero-api-endpoint/create-items', [HTTP_METHOD.POST], createItems);
		this.addEndpoint('/zotero-api-endpoint/create-items', [HTTP_METHOD.POST], getItemAttachments);
	}

	private addEndpoint(endpointName: string, supportedMethods: HTTP_METHOD[],
		endpointFunction: (data: any, sendResponseCallback: (status: HTTP_STATUS, type: string, message: string) => void) => void|Promise<void>){
		this.endpoints.push(endpointName);

		// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
		Zotero.Server.Endpoints[endpointName] = function() {
			return{
				supportedMethods,
				init: endpointFunction,
			};
		};
	}

	public removeEndpoints(): void{
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
function validatePostData(args: {[key:string]:any}, argsValidatorMap: {[key:string]:Function}, msg = '') {
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

/**
 * Returns an array with data on the accessible libraries, e.g.
 * ```
 * [
 *     {"libraryID":1,"libraryType":"user"},
 *     {"libraryID":12345,"libraryType":"group","groupID":987654,"groupName":"My Group"}
 * ]
 * ```
 */
function getLibraries(_: object, sendResponseCallback: (status: HTTP_STATUS, type: string, message: string) => void) {
	try {
		const libraryData = Zotero.Libraries.getAll().map(library => ({
			libraryID: library.libraryID,
			libraryType: library.libraryType,
			groupID: library.groupID,
			groupName: library.groupName,
		}));
		sendResponseCallback(HTTP_STATUS.OK, 'application/json', JSON.stringify(libraryData));
	}
	catch (error) {
		sendResponseCallback(HTTP_STATUS.SERVER_ERROR, 'text/plain', `Error occurred:\n${error}`);
	}
}


/**
 * Returns information on the current selection in Zotero, to allow to control the state of,
 * and input data for, external programs that interact with cita data.
 * Returns a map `{libraryID:int|null, collection: {}|null, selectedItems: {}[]}, childItems: {}[]}`
 * containing the libraryID, the item data of the selected collection and the contained
 * child items, and/or the individually selected items.
 */
function getSelection(data: object, sendResponseCallback: (status: HTTP_STATUS, type: string, message: string) => void) {
	try {
		const selectedItems = ZoteroPane.getSelectedItems();
		const collection = ZoteroPane.getSelectedCollection() || null;
		const childItems = collection? collection.getChildItems() : [];
		// How can I get the id independently of the selected collection/items?
		let libraryID = null;
		if (selectedItems.length) {
			libraryID = selectedItems[0].library.id;
		}
		else if (collection) {
			libraryID = collection.library.id;
		}
		const result = {
			libraryID,
			selectedItems,
			collection,
			childItems,
		};
		sendResponseCallback(HTTP_STATUS.OK, 'application/json', JSON.stringify(result));
	}
	catch (error) {
		sendResponseCallback(HTTP_STATUS.SERVER_ERROR, 'text/plain', `Error occurred:\n${error}`);
	}
}

/**
 * Searches a given library with a set of given conditions (see
 * https://www.zotero.org/support/dev/client_coding/javascript_api#executing_the_search) so that
 * an external program can check wether citing or cited references exist or need to be created.
 * Expect POST data containing a JSON object with properties `libraryID`, `query`, and `resultType`.
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
async function searchLibrary(data: {libraryID:number, query:object, resultType:'items'|'keys'|'hits'},
	sendResponseCallback: (status: HTTP_STATUS, type: string, message: string) => void) {
	try {
		this.validatePostData(data, {
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
			sendResponseCallback(HTTP_STATUS.OK, 'application/json', String(results.length));
			return;
		}
		let items = await Zotero.Items.getAsync(results);
		if (resultType === 'keys') {
			items = items.map(item => item.key as string);
		}
		sendResponseCallback(HTTP_STATUS.OK, 'application/json', JSON.stringify(items));
	}
	catch (error) {
		sendResponseCallback(HTTP_STATUS.SERVER_ERROR, 'text/plain', `Error occurred:\n${error}`);
	}
}

/**
 * Create or more items in the given library which can later be linked.
 * Expects JSON POST data containing an object with the following properties:
 * `libraryID`: the integer id of the library; `collections`: null if no collection,
 * or an array of collection keys which will be added to each newly created
 * entry; `items`: Either an array of zotero json item data or a string containing one
 * or more items in a format that can be recognized and translated by Zotero.
 * Returns the keys of the created items
 */
async function createItems(data: {libraryID:number, collections:string[], items:object[]|string},
	sendResponseCallback: (status: HTTP_STATUS, type: string, message: string) => void) {
	try {
		this.validatePostData(data, {
			libraryID: val => typeof val == 'number' && Number.isInteger(val),
			collections: val => val === null || Array.isArray(val),
			items: val => val && typeof val == 'string' || Array.isArray(val) && val.length > 0,
		}, 'libraryID: int, collections: array|null, items: object[]|string');

		const {libraryID, collections, items} = data;

		let zoteroItems: {key: string}[];

		if (items[0] && typeof items[0] == 'object' && 'itemType' in items[0]) {
			// items in Zotero-JSON
			const itemIds = [];
			for (const itemData of items as {itemType:string}[]) {
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
		const itemKeys = zoteroItems.map(item => item.key);
		sendResponseCallback(HTTP_STATUS.OK, 'application/json', JSON.stringify(itemKeys));
	}
	catch (error) {
		sendResponseCallback(HTTP_STATUS.SERVER_ERROR, 'text/plain', `Error occurred:\n${error}`);
	}
}

/**
 * Return the item data of the attachments of items identified by their key, with the
 * absolute path to the stored attachment files added, so that citation-mining software can extract
 * reference data from them.
 * Expects POST data containing an object with properties `libraryID` and `keys`. Returns  a map of
 * keys and attachment item data.
 */
async function getItemAttachments(data: {libraryID:number, keys:string[]}, sendResponseCallback: (status: HTTP_STATUS, type: string, message: string) => void) {
	try {
		this.validatePostData(data, {
			libraryID: val => typeof val == 'number' && Number.isInteger(val),
			keys: val => Array.isArray(val) && val.length > 0,
		}, 'libraryID: int, keys: string[]');

		const {libraryID, keys} = data;
		const attachments = {};
		for (const key of keys) {
			const item = await Zotero.Items.getByLibraryAndKeyAsync(libraryID, key);
			if (!item) {
				throw new Error(`No item with key ${key} exists.`);
			}
			attachments[key] = item.getAttachments().map(id => {
				const attachment = Zotero.Items.get(id);
				const result = attachment.toJSON();
				if (attachment.isFileAttachment()) {
					result.filepath = attachment.getFilePath();
				}
				return result as string;
			});
		}
		sendResponseCallback(HTTP_STATUS.OK, 'application/json', JSON.stringify(attachments));
	}
	catch (error) {
		sendResponseCallback(HTTP_STATUS.SERVER_ERROR, 'text/plain', `Error occurred:\n${error}`);
	}
}

const endpointManager = new EndpointManager();
endpointManager.addEndpoints();
