const { Cluster } = require('puppeteer-cluster');
const fs = require('fs');
const argv = require('yargs').argv;
const path = require('path');

let weburl = argv.u;
let weburlFile = argv.f;
let destination = argv._[0];
let rootDir = __dirname;

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

if (!fs.existsSync(weburlFile)) {
	console.error(weburlFile + ' does not exist!');
	process.exit();
} else if (path.extname(weburlFile) !== '.txt') {
	console.error(weburlFile + ' is not a text file!');
	process.exit();
}

let weburls;

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
		cluster.queue(weburl);
	});

	await cluster.idle();
	await cluster.close();
})();
