import Ajv from "ajv";

import { routes } from "./routes";

enum HTTP_STATUS {
	OK = 200,
	SERVER_ERROR = 500,
	NOT_FOUND = 404,
	CONFLICT = 409,
	BAD_REQUEST = 400,
}

enum HTTP_METHOD {
	GET = "GET",
	POST = "POST",
}

enum MIME_TYPE {
	TEXT = "text/plain",
	JSON = "application/json",
}

type ResponseCallback = (
	status: HTTP_STATUS,
	type: MIME_TYPE,
	message: string,
) => void;

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type EndpointFunction = (data: any) => Promise<any> | any;

interface Endpoint {
	endpoint: EndpointFunction;
}

interface ErrorResponse {
	error: string;
	diagnostics?: any;
}

export default class EndpointManager {
	private endpoints: string[];

	constructor() {
		this.endpoints = [];
		this.addEndpoints();
	}

	public addEndpoints(): void {
		for (const [
			endpointName,
			supportedMethods,
			endpoint,
			schemaFile,
		] of routes) {
			this.addEndpoint(
				endpointName,
				supportedMethods,
				endpoint,
				schemaFile,
			);
		}
	}

	private addEndpoint(
		endpointName: string,
		supportedMethods: HTTP_METHOD[],
		endpoint: Endpoint,
		schemaFile: string,
	) {
		this.endpoints.push(endpointName);

		Zotero.Server.Endpoints[endpointName] = function () {
			return {
				supportedMethods,
				init: async (
					data: any,
					sendResponseCallback: ResponseCallback,
				): Promise<void> => {
					const schema = JSON.parse(
						await Zotero.File.getResourceAsync(schemaFile),
					) as object;
					const ref = "#/definitions/RequestType";
					const options = { strict: false, validateSchema: false };
					const ajv = new Ajv(options);
					ajv.compile(schema);
					if (!ajv.validate(ref, data)) {
						const result: ErrorResponse = {
							error: "Request data validation failed",
							diagnostics: ajv.errorsText(),
						};
						sendResponseCallback(
							HTTP_STATUS.SERVER_ERROR,
							MIME_TYPE.JSON,
							JSON.stringify(result),
						);
					}
					try {
						const endpointFunction: EndpointFunction =
							endpoint.endpoint;
						const result = await endpointFunction(data);
						// todo: response validation
						sendResponseCallback(
							HTTP_STATUS.OK,
							MIME_TYPE.JSON,
							JSON.stringify(result),
						);
					} catch (error: any) {
						const result: ErrorResponse = {
							error: error.message,
						};
						sendResponseCallback(
							HTTP_STATUS.SERVER_ERROR,
							MIME_TYPE.JSON,
							JSON.stringify(result),
						);
					}
				},
			};
		};
	}

	public removeEndpoints(): void {
		this.endpoints.forEach((endpointName) => {
			delete Zotero.Server.Endpoints[endpointName];
		});
	}
}
