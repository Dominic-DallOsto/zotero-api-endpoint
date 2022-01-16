/* eslint-disable @typescript-eslint/unbound-method */

declare const Zotero: any;

import Ajv from '../lib/ajv2020.bundle.js';

import * as addAttachmentFromFile from './endpoints/add-attachment-from-file';
import * as getItemAttachments from './endpoints/get-item-attachments';
import * as createItems from './endpoints/create-items';
import * as getLibraries from './endpoints/get-libraries';
import * as getSelection from './endpoints/get-selection';
import * as searchLibrary from './endpoints/search-library';

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

type EndpointFunction = (data) => Promise<any> | any;

interface Endpoint {
	endpoint: EndpointFunction
}

interface ErrorResponse {
	error: string
	diagnostics?: any
}

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

	private addEndpoint(endpointName: string, supportedMethods: HTTP_METHOD[], endpoint: Endpoint) {
		this.endpoints.push(endpointName);

		// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
		Zotero.Server.Endpoints[endpointName] = function () {
			return {
				supportedMethods,
				init: async (data: any, sendResponseCallback: ResponseCallback): Promise<void> => {
					const ajv = new Ajv() // options can be passed, e.g. {allErrors: true}
					const endpointBaseName = endpointName.split("/").pop();
					const schemaFile = `chrome://zotero-api-endpoint/content/schema/${endpointBaseName}.json`;
					const schema = JSON.parse(await Zotero.File.getResourceAsync(schemaFile));
					const validate = ajv.compile(schema);
					if (!validate(data)) {
						const result: ErrorResponse = {
							error: "Request data validation failed",
							diagnostics: validate.errors
						}
						sendResponseCallback(HTTP_STATUS.SERVER_ERROR, MIME_TYPE.JSON, JSON.stringify(result));
					}
					try {
						const endpointFunction: EndpointFunction = endpoint.endpoint;
						const result = await endpointFunction(data);
						// todo: response validation
						sendResponseCallback(HTTP_STATUS.OK, MIME_TYPE.JSON, JSON.stringify(result));
					} catch (e) {
						const result: ErrorResponse = {
							error: e.message
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
