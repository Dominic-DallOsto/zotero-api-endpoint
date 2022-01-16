declare const Zotero: any;
declare const OS: any;

/**
 * Returns the path of the attachment, downloading it if it doesn't exist
 */
export async function getAttachmentPath(item: any): Promise<string> {
	let filepath = item.getFilePath() as string;
	if (!filepath || OS.File.exists(filepath)) {
		await Zotero.Sync.Runner.downloadFile(item);
		filepath = item.getFilePath() as string;
	}
	return filepath;
}

/**
 * Validates JSON POST object against a validation map of validator functions.
 * Unless the validation functions returns true, an error is thrown.
 *
 * @param {{[key:string]:any}} args
 * @param {{[key:string]:function}} argsValidatorMap
 * @param {string?} msg Optional informational message about the required value type
 */
export function validatePostData(args: { [key: string]: any },
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
