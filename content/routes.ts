// zotero-api-endpoint endpoints

import * as getLibraries from './endpoints/get-libraries';
import * as getSelection from './endpoints/get-selection';
import * as searchLibrary from './endpoints/search-library';
import * as addAttachmentFromFile from './endpoints/add-attachment-from-file';
import * as getItemAttachments from './endpoints/get-item-attachments';
import * as createItems from './endpoints/create-items';
import * as getVersion from './endpoints/get-version';
import * as updateItem from './endpoints/item-update';
import * as getItems from './endpoints/get-items';

export enum HTTP_METHOD {
	GET = 'GET',
	POST = 'POST',
}

interface Endpoint {
	endpoint: (data) => Promise<any> | any
}

type EndpointList = [ string, HTTP_METHOD[], Endpoint, string][];

export const routes: EndpointList = [
	['/zotero-api-endpoint/attachment/add', [HTTP_METHOD.POST], addAttachmentFromFile, 'resource://zotero-api-endpoint/schema/add-attachment-from-file.json'],
	['/zotero-api-endpoint/attachment/get', [HTTP_METHOD.POST], getItemAttachments, 'resource://zotero-api-endpoint/schema/get-item-attachments.json'],
	['/zotero-api-endpoint/item/create', [HTTP_METHOD.POST], createItems, 'resource://zotero-api-endpoint/schema/create-items.json'],
	['/zotero-api-endpoint/library/list', [HTTP_METHOD.GET], getLibraries, 'resource://zotero-api-endpoint/schema/get-libraries.json'],
	['/zotero-api-endpoint/library/search', [HTTP_METHOD.POST], searchLibrary, 'resource://zotero-api-endpoint/schema/search-library.json'],
	['/zotero-api-endpoint/selection/get', [HTTP_METHOD.GET], getSelection, 'resource://zotero-api-endpoint/schema/get-selection.json'],
	['/zotero-api-endpoint/version', [HTTP_METHOD.GET], getVersion, 'resource://zotero-api-endpoint/schema/get-version.json'],
	['/zotero-api-endpoint/item/update', [HTTP_METHOD.POST], updateItem, 'resource://zotero-api-endpoint/schema/item-update.json'],
	['/zotero-api-endpoint/items', [HTTP_METHOD.POST], getItems, 'resource://zotero-api-endpoint/schema/items.json'],
];
