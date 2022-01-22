// zotero-api-endpoint endpoints

import * as getLibraries from './endpoints/get-libraries';
import * as getSelection from './endpoints/get-selection';
import * as searchLibrary from './endpoints/search-library';
import * as addAttachmentFromFile from './endpoints/add-attachment-from-file';
import * as getItemAttachments from './endpoints/get-item-attachments';
import * as createItems from './endpoints/create-items';

export enum HTTP_METHOD {
	GET = 'GET',
	POST = 'POST',
}

interface Endpoint {
	endpoint: (data) => Promise<any> | any
}

type EndpointList = [ string, HTTP_METHOD[], Endpoint][];

export const routes: EndpointList = [
	['/zotero-api-endpoint/attachment/add', [HTTP_METHOD.POST], addAttachmentFromFile],
	['/zotero-api-endpoint/attachment/get', [HTTP_METHOD.POST], getItemAttachments],
	['/zotero-api-endpoint/item/create', [HTTP_METHOD.POST], createItems],
	['/zotero-api-endpoint/library/list', [HTTP_METHOD.GET], getLibraries],
	['/zotero-api-endpoint/library/search', [HTTP_METHOD.POST], searchLibrary],
	['/zotero-api-endpoint/selection/get', [HTTP_METHOD.GET], getSelection],
];
