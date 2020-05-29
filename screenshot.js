const { Cluster } = require('puppeteer-cluster');
const fs = require('fs');
const argv = require('yargs').argv;
const path = require('path');
const sha1File = require('sha1-file');

let weburl = argv.u;
let weburlFile = argv.f;
let destination = argv._[0];
let rootDir = __dirname;
let forceEnabled = argv.force;

let usage = () => {
	console.log(
		'Usage: node screenshot.js [-u https://example.com] [-f /tmp/file.txt] /save/screenshot/here'
	);
};

if (!(weburl || weburlFile)) {
	console.error('Pass a weburl or a file containing weburls');
	usage();
	process.exit();
}

if (weburl) {
	if (!weburl.match(/^https?:\/\/[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)+$/)) {
		console.error(`${weburl}: Regex Validation Failed`);
		usage();
		process.exit();
	}
}

if (!destination) {
	console.error('Pass the screenshot destination path');
	usage();
	process.exit();
}

if (!(fs.existsSync(destination) && fs.lstatSync(destination).isDirectory())) {
	console.error(destination + ' is not a valid directory!');
	usage();
	process.exit();
}

if (weburlFile) {
	if (!fs.existsSync(weburlFile)) {
		console.error(weburlFile + ' does not exist!');
		process.exit();
	} else if (path.extname(weburlFile) !== '.txt') {
		console.error(weburlFile + ' is not a text file!');
		process.exit();
	}
}

let weburls = [];

if (weburlFile) {
	weburls = fs.readFileSync(weburlFile).toString().trim().split('\n');
} else {
	weburls.push(weburl);
}

(async () => {
	const cluster = await Cluster.launch({
		concurrency: Cluster.CONCURRENCY_CONTEXT,
		maxConcurrency: 10,
		puppeteerOptions: {
			ignoreHTTPSErrors: true,
			args: ['--no-sandbox'],
		},
	});

	// Event handler to be called in case of problems
	cluster.on('taskerror', (err, data) => {
		console.error(`Error crawling ${data}: ${err.message}`);
		fs.copyFileSync(
			rootDir + '/screenshots/screenshot-error.png',
			destination + '/' + data.replace(/\/|:/g, '_') + '.png'
		);
	});

	await cluster.task(async ({ page, data: url }) => {
		await page.goto(url);
		await page.screenshot({
			path: destination + '/' + url.replace(/\/|:/g, '_') + '.png',
		});
		// Store screenshot, do something else
	});

	weburls.forEach((weburl) => {
		// If forceEnabled, screenshot any way
		// If file does not exist or is a screenshot error, then screenshot. Else, skip.
		if (forceEnabled) {
			// console.log('Screenshot: Because Forced');
			cluster.queue(weburl);
		} else if (
			!fs.existsSync(destination + '/' + weburl.replace(/\/|:/g, '_') + '.png')
		) {
			// console.log('Screenshot: File does not exist');
			cluster.queue(weburl);
		} else if (
			sha1File.sync(
				destination + '/' + weburl.replace(/\/|:/g, '_') + '.png'
			) === 'eecdf9673374064d6aded1ac4e9209e56e8fe4df'
		) {
			// console.log('Screenshot: Old File was error');
			cluster.queue(weburl);
		}
	});

	await cluster.idle();
	await cluster.close();
})();
