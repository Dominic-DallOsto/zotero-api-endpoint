export type ResponseType = string;

export type RequestType = null;

import { version } from '../../package.json';

/**
 * Returns version number of this package - can be used as a test for whether the extension is active.
 */
export function endpoint(_: object): ResponseType {
	return version;
}
