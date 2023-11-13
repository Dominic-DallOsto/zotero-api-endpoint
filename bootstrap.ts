/* eslint-disable prefer-arrow/prefer-arrow-functions, no-var, @typescript-eslint/no-unused-vars, no-caller */

declare const dump: (msg: string) => void;
declare const Components: any;
declare const ChromeUtils: any;
declare var Services: any;
const {
	interfaces: Ci,
	results: Cr,
	utils: Cu,
	Constructor: CC,
	classes: Cc,
} = Components;

enum Reason {
	APP_STARTUP     = 1, // The application is starting up.
	APP_SHUTDOWN    = 2, // The application is shutting down.
	ADDON_ENABLE    = 3, // The add-on is being enabled.
	ADDON_DISABLE   = 4, // The add-on is being disabled. (Also sent during uninstallation)
	ADDON_INSTALL   = 5, // The add-on is being installed.
	ADDON_UNINSTALL = 6, // The add-on is being uninstalled.
	ADDON_UPGRADE   = 7, // The add-on is being upgraded.
	ADDON_DOWNGRADE = 8, // The add-on is being downgraded.
}

type BootstrapData = {
	id:           string  // The ID of the add-on being bootstrapped.
	version:      string  // The version of the add-on being bootstrapped.
	installPath:  any     // nsIFile; The installation location of the add-on being bootstrapped. This may be a directory or an XPI file depending on whether the add-on is installed unpacked or not.
	resourceURI:  any     // nsIURI; A URI pointing at the root of the add-ons files, this may be a jar: or file: URI depending on whether the add-on is installed unpacked or not.
	oldVersion:   string  // The previously installed version, if the reason is ADDON_UPGRADE or ADDON_DOWNGRADE, and the method is install or startup.
	newVersion:   string  // The version to be installed, if the reason is ADDON_UPGRADE or ADDON_DOWNGRADE, and the method is shutdown or uninstall.
};

const patch_marker = 'UnpatchedZoteroApiEndpoint';
function patch(object, method, patcher) {
	if (object[method][patch_marker]) return;
	object[method][patch_marker] = object[method];
	object[method] = patcher(object[method]);
}

if (typeof Zotero == 'undefined') {
	var Zotero;
}

function log(msg) {
	Zotero.debug(`EndpointManager: (bootstrap) ${msg}`);
}

// In Zotero 6, bootstrap methods are called before Zotero is initialized, and using include.js
// to get the Zotero XPCOM service would risk breaking Zotero startup. Instead, wait for the main
// Zotero window to open and get the Zotero object from there.
//
// In Zotero 7, bootstrap methods are not called until Zotero is initialized, and the 'Zotero' is
// automatically made available.
async function waitForZotero() {
	if (typeof Zotero != 'undefined') {
		await Zotero.initializationPromise;
		return;
	}

	// eslint-disable-next-line @typescript-eslint/no-shadow
	var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
	var windows = Services.wm.getEnumerator('navigator:browser');
	var found = false;
	while (windows.hasMoreElements()) {
		const win = windows.getNext();
		if (win.Zotero) {
			Zotero = win.Zotero;
			found = true;
			break;
		}
	}
	if (!found) {
		await new Promise(resolve => {
			var listener = {
				onOpenWindow(aWindow) {
					// Wait for the window to finish loading
					const domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
					domWindow.addEventListener('load', function() {
						domWindow.removeEventListener('load', arguments.callee, false);
						if (domWindow.Zotero) {
							Services.wm.removeListener(listener);
							Zotero = domWindow.Zotero;
							resolve(undefined);
						}
					}, false);
				},
			};
			Services.wm.addListener(listener);
		});
	}
	await Zotero.initializationPromise;
}

class ZoteroApiEndpoint {
	public async install(_data: BootstrapData, _reason: Reason) {
		await waitForZotero();
		log('Installed');
	}

	public async startup({ _id, _version, resourceURI, rootURI = resourceURI.spec }) {
		await waitForZotero();

		log('Starting');

		// 'Services' may not be available in Zotero 6
		if (typeof Services == 'undefined') {
			// eslint-disable-next-line @typescript-eslint/no-shadow
			var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
		}

		log(`rootURI: ${rootURI}`);

		if (Zotero.platformMajorVersion >= 102) { // eslint-disable-line @typescript-eslint/no-magic-numbers
			log('set handlers');
			log('set resource handler');
			const resProto = Cc['@mozilla.org/network/protocol;1?name=resource'].getService(Ci.nsISubstitutingProtocolHandler);
			const uri = Services.io.newURI(`${rootURI  }resource/`);
			log(`uri: ${uri}`);
			resProto.setSubstitutionWithFlags('zotero-api-endpoint', uri, resProto.ALLOW_CONTENT_ACCESS);
		}

		// If we load a module as a subscript, it will have access to Zotero as a global variable
		log('loading javascript');
		var win = Zotero.getMainWindow();
		log('test0');
		Services.scriptloader.loadSubScript(`${rootURI}/content/endpoint-manager.js`, { Zotero });
		log('loaded javascript');

		log('startup finished');
	}

	public shutdown(_data: BootstrapData, _reason: Reason) {
		log('Shutting down');

		if (Zotero.endpointManager) {
			try {
				log('remove Endpoints');
				Zotero.endpointManager.removeEndpoints();
				delete Zotero.endpointManager;
				log('removed Endpoints');
			}
			catch (err) {
				log(`shutdown error: ${err}`);
			}
		}
	}

	public uninstall(_data: BootstrapData, _reason: Reason) {
		// `Zotero` object isn't available in `uninstall()` in Zotero 6, so log manually
		if (typeof Zotero == 'undefined') {
			dump('EndpointManager: Uninstalled\n\n');
			return;
		}

		log('Uninstalled');
	}
}

const ApiEndpoint = new ZoteroApiEndpoint;

export const install = ApiEndpoint.install.bind(ApiEndpoint);
export const uninstall = ApiEndpoint.uninstall.bind(ApiEndpoint);
export const startup = ApiEndpoint.startup.bind(ApiEndpoint);
export const shutdown = ApiEndpoint.shutdown.bind(ApiEndpoint);
