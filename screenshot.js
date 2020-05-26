const puppeteer = require('puppeteer');
const validUrl = require('valid-url');
const fs = require('fs');

let weburl = process.argv[2];
let path = process.argv[3];

if (!validUrl.isUri(weburl)) {
	console.log('Not a URI');
	process.exit();
}

if (!(fs.existsSync(path) && fs.lstatSync(path).isDirectory())) {
	console.log('Not a valid directory!');
	process.exit();
}

(async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	try {
		await page.goto(weburl, { waitUntil: 'load', timeout: 10000 });
	} catch (e) {
		//
	}
	await page.screenshot({ path: path + weburl.replace(/\//g, '_') + '.png' });
	await browser.close();
})();
