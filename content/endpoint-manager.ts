/* eslint-disable @typescript-eslint/unbound-method */

declare const Zotero: any;

import { endpoint as addAttachmentFromFile} from './endpoints/add-attachment-from-file';
import { endpoint as getItemAttachments } from './endpoints/get-item-attachments';
import { endpoint as createItems} from './endpoints/create-items';
import { endpoint as getLibraries } from './endpoints/get-libraries';
import { endpoint as getSelection } from './endpoints/get-selection';
import { endpoint as searchLibrary } from './endpoints/search-library';

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

const endpointManager = new EndpointManager();
endpointManager.addEndpoints();
