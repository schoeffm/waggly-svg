wsvg
=============

# Description

`wsvg` is a command line tool which converts SVG-images into hand-drawn looking graphics. It parses the nodes of the SVG-image and turns mostly all straight lines (so _polyline_, _rect_ and _polygon_ to be precisely) into waggly lines. All styles and other attributes on the nodes will be presevered.

So for example it will turn the left input into the right output:

![Alt text](doc/example.png =550x)

# Usage

### CLI tool

Actually there are several ways to make use of the tool.

To install `wsvg` from npm, run:

```
$ npm install -g wsvg
```

After that you should be able to call the tool:

```
$ wsvg --help

  Usage: wsvg [options]

  Options:

    -h, --help                output usage information
    -V, --version             output the version number
    -p, --png                 Export to PNG
    -c, --content <content>   SVG-content as string input
    -i, --input <path>        Input SVG-File which should be turned into a waggly output-version
    -o, --output <path>       Output filename
    -w, --waggly              Turns on the waggly-mode (without, it won't change anything)
    --wagInterval <interval>  Interval for our wags (default is 10)
    --wagSize <interval>      Size for the wags (default is 1.5)
```

using `wagInterval` and `wagSize` you'll be able to adjust the effect.


### node module

You can also embed the tool in your own project. All you'll have to do is to install it as a dependency like i.e.:
```
$ npm install --save wsvg
```

Afterwards you should be able to require the tool using:

```
var wagglySvg = require('./waggly-svg');

var config = {
    waggly: true,
    wobble_interval: 10,
    wobble_size: 1.5
};

var svgTransformer = wagglySvg.create(config, function(transformed) {
    console.log(transformed);
});

svgTransformer.transformFile('<ns0:polyline fill="none" points="0.5,-60.5 79.70,-60.5 83.5,-60.5" stroke="black"/>');
```

The module exposes one factory-method which returns the actual transformer based on the given configuration. 

#### Factory
`create(config, callback)`: Creates a new transformer-instance based on the given configuraiton. Currently there are three properties supported:

```
{
    waggly: true,			// activates the waggly-mode
    wobble_interval: 30,	// configures the distance of the wags
    wobble_size: 1.5		// ... and the size of 'em
}
```

The callback-function gets the transformed svg-output as parameter for further processing.

#### Transformer
`svgTransformer.transformFile(pathToFile)`: Starts the transformation by reading the file-input and turning it into a hand-drawn version.

`svgTransformer.transformString(stringInput)`: Starts the transformation based on the given input.

# Prerequisites

Currently none.

<!-- 
- rsvg-convert
- graphviz
-->


# License

Copyright (c) 2015 Stefan Schöffmann

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

# Acknowledgments

Granted, the idea is [not new](http://www.yuml.me/) - but since I'm absolutely no python guy I couldn't contribute to the excellent work of [Aivarsk](https://github.com/aivarsk)'s [Scruffy](https://github.com/aivarsk/scruffy) - but got heavily inspired by it. Based on his efforts this module was created.


