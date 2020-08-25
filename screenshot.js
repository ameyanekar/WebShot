const { Cluster } = require('puppeteer-cluster');
const fs = require('fs');
const argv = require('yargs').argv;
const path = require('path');
const sha1File = require('sha1-file');
const colors = require('colors');

let banner = () => {
	console.log(
		`
		$$\\      $$\\           $$\\        $$$$$$\\  $$\\                  $$\\     
		$$ | $\\  $$ |          $$ |      $$  __$$\\ $$ |                 $$ |    
		$$ |$$$\\ $$ | $$$$$$\\  $$$$$$$\\  $$ /  \\__|$$$$$$$\\   $$$$$$\\ $$$$$$\\   
		$$ $$ $$\\$$ |$$  __$$\\ $$  __$$\\ \\$$$$$$\\  $$  __$$\\ $$  __$$\\\\_$$  _|  
		$$$$  _$$$$ |$$$$$$$$ |$$ |  $$ | \\____$$\\ $$ |  $$ |$$ /  $$ | $$ |    
		$$$  / \\$$$ |$$   ____|$$ |  $$ |$$\\   $$ |$$ |  $$ |$$ |  $$ | $$ |$$\\ 
		$$  /   \\$$ |\\$$$$$$$\\ $$$$$$$  |\\$$$$$$  |$$ |  $$ |\\$$$$$$  | \\$$$$  |
		\\__/     \\__| \\_______|\\_______/  \\______/ \\__|  \\__| \\______/   \\____/ 

									By: @ameyanekar
		`.green
	);
};

let usage = () => {
	banner();
	console.log(
		`
Usage: node screenshot.js [-u https://example.com] [-f /home/user/subdomains.txt] [-o /save/screenshots/here]
		
Arguments:
	-h			Show this help message and exit
	-u			URL to screenshot
	-f			File containing URLs to screenshot
	-o			Save screenshots to this directory. If not provided, screenshots will be stored to screenshots directory.
	-s			Suppress CLI Output
	-c			Number of concurrent sessions (Default: 5)
	-t			Navigation Timeout in seconds (Default: 30)
	--cookies	Cookies to add to the request for pages requiring an authenticated session (E.g.: "cookie=value1; cookie2=value2" )
	--force		By default, the tool will skip screenshots for URLs already present in the destination directory.
				Use --force flag to override this behaviour.
				If earlier screenshot was a failure, the tool will attempt the screenshot even without the force flag.
`.green
	);
};

let isValidURL = (url) => {
	if (
		url.match(
			/^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/
		)
	)
		return true;
	else return false;
};

if (argv.h) {
	usage();
	process.exit();
}

let weburl = argv.u;
let weburlFile = argv.f;
let rootDir = __dirname;
let destination = argv.o ? argv.o : `${rootDir}/screenshots/`;
let forceEnabled = argv.force;
let concurrentSessions = argv.c && typeof argv.c === 'number' ? argv.c : 5;
let suppressCLI = argv.s;
let timeout = argv.t && typeof argv.t === 'number' ? argv.t * 1000 : 30000;
let cookies = argv.cookies;

let getDate = () => {
	let now = new Date();
	return now.toUTCString();
};

if (!(weburl || weburlFile)) {
	console.error('Pass a weburl or a file containing weburls'.red);
	usage();
	process.exit();
}

if (weburl) {
	if (!isValidURL(weburl)) {
		console.error(`${weburl}: is not a valid URL`.red);
		usage();
		process.exit();
	}
}

if (!(fs.existsSync(destination) && fs.lstatSync(destination).isDirectory())) {
	console.error(destination + ' is not a valid directory!');
	usage();
	process.exit();
}

if (weburlFile) {
	if (!fs.existsSync(weburlFile)) {
		console.error(`${weburlFile} does not exist!`.red);
		process.exit();
	} else if (path.extname(weburlFile) !== '.txt') {
		console.error(`${weburlFile} is not a text file!`.red);
		process.exit();
	}
}

if (cookies) {
	cookiesArray = cookies.replace(/\s/g, '').split(';');
}

let weburls = [];

banner();

if (weburlFile) {
	weburls = fs.readFileSync(weburlFile).toString().trim().split('\n');
	console.log(`Reading URLs from ${weburlFile}`);
	console.log(`Concurrency: ${concurrentSessions}`);
} else {
	weburls.push(weburl);
}

(async () => {
	const cluster = await Cluster.launch({
		concurrency: Cluster.CONCURRENCY_CONTEXT,
		maxConcurrency: concurrentSessions,
		puppeteerOptions: {
			ignoreHTTPSErrors: true,
			args: ['--no-sandbox'],
			headless: false,
		},
	});

	// Event handler to be called in case of problems
	cluster.on('taskerror', (err, data) => {
		if (!suppressCLI)
			console.log(
				`${getDate()}: Error crawling ${data.weburl}: ${err.message}`
			);
		fs.copyFileSync(
			rootDir + '/screenshots/DO-NOT-DELETE.png',
			destination + '/' + data.weburl.replace(/\/|:/g, '_') + '.png'
		);
	});

	await cluster.task(async ({ page, data }) => {
		if (!suppressCLI)
			console.log(
				`${getDate()}: Screenshotting ${data.weburl}${
					data.reason ? ': ' + data.reason : ''
				}`
			);

		if (cookies) {
			cookiesArray.forEach(async (cookie) => {
				name = cookie.split('=')[0];
				value = cookie.split('=')[1];

				if (name && value)
					await page.setCookie({ name, value, url: data.weburl });
			});
		}
		await page.goto(data.weburl, { waitUntil: 'load', timeout });
		await page.screenshot({
			path: destination + '/' + data.weburl.replace(/\/|:/g, '_') + '.png',
		});
	});

	weburls.forEach((weburl) => {
		// If forceEnabled, screenshot any way
		// If file does not exist or is a screenshot error, then screenshot. Else, skip.
		if (isValidURL(weburl)) {
			if (forceEnabled) {
				cluster.queue({ weburl, reason: 'Forced' });
			} else if (
				!fs.existsSync(
					destination + '/' + weburl.replace(/\/|:/g, '_') + '.png'
				)
			) {
				cluster.queue({ weburl });
			} else if (
				sha1File.sync(
					destination + '/' + weburl.replace(/\/|:/g, '_') + '.png'
				) === 'eecdf9673374064d6aded1ac4e9209e56e8fe4df'
			) {
				cluster.queue({ weburl, reason: 'Old File was erroneous' });
			} else {
				if (!suppressCLI)
					console.log(
						`${getDate()}: Screenshot Skipped: ${weburl}: Already Exists`
					);
			}
		} else {
			console.error(`${weburl}: is not a valid URL`.red);
			return;
		}
	});

	await cluster.idle();
	await cluster.close();
})();
