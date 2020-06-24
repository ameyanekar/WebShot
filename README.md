# WebShot
WebShot is a tool designed to capture screenshots of provided Web URLs in a concurrent manner.

## Motivation
This tool was designed with bug bounty hunters in mind.

Repeatedly running existing screenshot utilities on the same set of URLs, would result in unnecessary requests to URLs which have been captured successfully earlier. I have designed WebShot to identify such instances and avoiding unnecessary network usage for repeated screenshots.

WebShot also identifies screenshot attempts that had failed earlier and attempts to capture them in the current run.

You can safely run WebShot on the same set of Web URLs providing the same output directory as was used earlier without overwriting earlier successful screenshots.

Existing screenshot utilities provided unnecessary functionalities such as HTML Reporting which could not be disabled.

## Pre-Requisites
Node.js

npm


## Installation

```bash
git clone https://github.com/ameyanekar/WebShot.git
cd WebShot
npm install #sudo if necessary
```

## Usage

```text
Usage: node screenshot.js [-u https://example.com] [-f /home/user/subdomains.txt] [-o /save/screenshots/here]

Arguments:
        -h              Show this help message and exit
        -u              URL to screenshot
        -f              File containing URLs to screenshot
        -o              Save screenshots to this directory. If not provided, screenshots will be stored to screenshots directory.
        -s              Suppress CLI Output
        -c              Number of concurrent sessions (Default: 5)
        -t              Navigation Timeout in seconds (Default: 30)
        --force         By default, the tool will skip screenshots for URLs already present in the destination directory.
                        Use -force flag to override this behaviour.
                        If earlier screenshot was a failure, the tool will attempt the screenshot even without the force flag.
```
## Feedback
This is my first open source tool. Any feedback/criticism is hugely welcome.


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[ISC](https://opensource.org/licenses/ISC)
