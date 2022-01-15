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
