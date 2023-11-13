/* eslint-disable @typescript-eslint/unbound-method */

declare const Zotero: any;

import Ajv from 'ajv';

import {routes} from './routes';

declare const Components: any;
Components.utils.import('resource://gre/modules/Console.jsm');

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

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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
		for (const [endpointName, supportedMethods, endpoint, schemaFile] of routes) {
			Zotero.debug(`add schema: ${schemaFile}`);
			this.addEndpoint(endpointName, supportedMethods, endpoint, schemaFile);
		}
	}

	private addEndpoint(endpointName: string, supportedMethods: HTTP_METHOD[], endpoint: Endpoint, schemaFile: string) {
		this.endpoints.push(endpointName);

		// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
		Zotero.Server.Endpoints[endpointName] = function() {
			return {
				supportedMethods,
				init: async (data: any, sendResponseCallback: ResponseCallback): Promise<void> => {
					const schema = JSON.parse(await Zotero.File.getResourceAsync(schemaFile) as string) as object;
					const ref = '#/definitions/RequestType';
					const options = {strict: false, validateSchema: false, logger: console};
					const ajv = new Ajv(options);
					ajv.compile(schema);
					if (!ajv.validate(ref, data)) {
						const result: ErrorResponse = {
							error: 'Request data validation failed',
							diagnostics: ajv.errorsText(),
						};
						sendResponseCallback(HTTP_STATUS.SERVER_ERROR, MIME_TYPE.JSON, JSON.stringify(result));
						Zotero.debug('EndpointManager: set error schema not valid');
					}
					try {
						const endpointFunction: EndpointFunction = endpoint.endpoint;
						const result = await endpointFunction(data);
						// todo: response validation
						sendResponseCallback(HTTP_STATUS.OK, MIME_TYPE.JSON, JSON.stringify(result));
						Zotero.debug('EndpointManager: set repsonse ok');
					}
					catch (e) {
						const result: ErrorResponse = {
							error: e.message,
						};
						sendResponseCallback(HTTP_STATUS.SERVER_ERROR, MIME_TYPE.JSON, JSON.stringify(result));
						Zotero.debug('EndpointManager: set repsonse error');
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

Zotero.endpointManager = Zotero.endpointManager || new EndpointManager();
Zotero.endpointManager.addEndpoints();
