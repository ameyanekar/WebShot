const puppeteer = require('puppeteer');
const validUrl = require('valid-url');
const fs = require('fs');

let weburl = process.argv[2];
let path = process.argv[3];
let home = __dirname;

let usage = () => {
	console.log('Usage: node screenshot.js https://example.com /tmp/');
};

if (!validUrl.isUri(weburl)) {
	usage();
	process.exit();
}

if (!(fs.existsSync(path) && fs.lstatSync(path).isDirectory())) {
	console.log(path + ' is not a valid directory!');
	process.exit();
}

(async () => {
	const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
	const page = await browser.newPage();
	try {
		await page.goto(weburl, { waitUntil: 'load', timeout: 10000 });
		await page.screenshot({
			path: path + weburl.replace(/\/|:/g, '_') + '.png',
		});
	} catch (e) {
		fs.copyFile(
			home + '/screenshots/screenshot-error.png',
			path + weburl.replace(/\/|:/g, '_') + '.png',
			async () => {
				await browser.close();
			}
		);
	}
	await browser.close();
})();
