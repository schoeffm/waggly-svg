'use strict';
const _ = require('lodash');
const xmlParser = require('node-xml');
const fs = require('fs');
const util = require('./waggly-utils');

const WagglyTransformer = function(config, callback) {
    const self = this;
    this.callback = callback;
    this.config = config;

    const toNamespaces = (namespaces) =>
        _.reduce(namespaces, (a, ns) =>
            a += ((_.isEmpty(ns[0])) ? ' xmlns' : ` xmlns:${ns[0]}`) + `="${ns[1]}"`, '');

    const toAttributes = (attrs) => _.reduce(attrs, function(a, at) {return a += ` ${at[0]}="${at[1]}"`;}, '');

    /**
     * @param attrs
     */
    const toAttributesExcept = function(attrs) {
        var exceptions = _.drop(arguments);
        return toAttributes(_.filter(attrs, function(element) { return ! _.includes(exceptions, element[0]); }));
    };

    const getAttributeValue = function(attrs, needle) {
        var foundElement = _.find(attrs, function(element) { return element[0] === needle; });
        return (foundElement) ? foundElement[1] : undefined;
    };

    const transformText = function(elem, attrs, prefix, namespaces) {
        return `<${(_.isEmpty(prefix) ? '' : prefix + ':')}` +
            `${elem}${toNamespaces(namespaces)}` +
            `${toAttributesExcept(attrs, 'font-family', 'font-size')} ` +
            `font-family="${self.config.font_family}" ` +
            `font-size="${(self.config.font_size) ? self.config.font_size : '10'}" >`;
    };

    const transformPolyline = function(elem, attrs, prefix, namespaces, context) {
        return `<${_.isEmpty(prefix) ? '' : prefix + ':'}` +
            `${elem}${toNamespaces(namespaces)}${toAttributesExcept(attrs, 'points')} ` +
            `points="${util.processPolygonAsString(getAttributeValue(attrs, 'points'), _.merge(self.config, context))}" >`;
    };

    /**
     * <line x1="1.685" y1="-0.75" x2="2.815" y2="-0.75" stroke-width="0.0094118"/>
     */
    const transformLine = function(elem, attrs, prefix, namespaces, context) {
        const x1 = parseFloat(getAttributeValue(attrs, 'x1'));
        const y1 = parseFloat(getAttributeValue(attrs, 'y1'));
        const x2 = parseFloat(getAttributeValue(attrs, 'x2'));
        const y2 = parseFloat(getAttributeValue(attrs, 'y2'));

        const points = [{x:x1, y:y1},{x:x2,y:y2}];

        return `<${_.isEmpty(prefix) ? '' : prefix + ':'}` +
            `polyline${toNamespaces(namespaces)}${toAttributesExcept(attrs, 'points')}` +
            ` points="${util.pointsToString(util.processPolygon(points, _.merge(self.config, context)))}" >`;
    };

    const transformRectangle = function(elem, attrs, prefix, namespaces, context) {
        const x = parseFloat(getAttributeValue(attrs, 'x'));
        const y = parseFloat(getAttributeValue(attrs, 'y'));
        const width = parseFloat(getAttributeValue(attrs, 'width'));
        const height = parseFloat(getAttributeValue(attrs, 'height'));

        const points = [{x:x, y:y},{x:x+width,y:y},{x:x+width,y:y+height},{x:x,y:y+height}];
        return `<${_.isEmpty(prefix) ? '' : prefix + ':'}` +
            `polygon${toNamespaces(namespaces)}${toAttributesExcept(attrs, 'd')}` +
            ` points="${util.pointsToString(util.processPolygon(points, _.merge(self.config, context)))}" >`;
    };

    const transformPath = function(elem, attrs, prefix, namespaces, context) {
        const path = getAttributeValue(attrs, 'd');
        if (util.isStraightLine(path)) {
            const cleared = _.trim(path.replace('M',' ').replace('C',' '));
            const points = util.stringToPoints(cleared, context.unit);
            return `<${_.isEmpty(prefix) ? '' : prefix + ':'}` +
                `polyline${toNamespaces(namespaces)}${toAttributesExcept(attrs, 'd')}` +
                ` points="${util.pointsToString(util.processPolygon(points, _.merge(self.config, context)))}" >`;
        } else {
            return `<${_.isEmpty(prefix) ? '' : prefix + ':'}` +
                `${elem}${toNamespaces(namespaces)}${toAttributes(attrs)} >`;
        }
    };

    const isVisible = function(attrs) {
        const stroke = getAttributeValue(attrs, 'stroke');
        return stroke !== 'none';
    };

    const isPolyline = function(elem, attrs) {
        return isVisible(attrs) && (elem.toLowerCase() === 'polyline' || elem.toLowerCase() === 'polygon');
    };

    const isRectangle = function(elem, attrs) {
        return isVisible(attrs) && elem.toLocaleString() === 'rect';
    };

    const isRootSVGElement = function(elem) {
        return elem.toLowerCase() === 'svg';
    };

    this.parser = new xmlParser.SaxParser(function(cb) {
        let svgOutput = '';
        let changeClosingTagTo = '';
        let context = {};

        cb.onStartDocument(function() {
            svgOutput = '';
        });
        cb.onEndDocument(function() {
            self.callback(svgOutput);
        });

        cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
            if (isRootSVGElement(elem)) {
                context.unit = _.endsWith(getAttributeValue(attrs, 'width'),'in') ? 'in' : 'px';
            }
            if (isPolyline(elem, attrs)) {
                svgOutput += transformPolyline(elem, attrs, prefix, namespaces, context);
            } else if (elem.toLowerCase() === 'line') {
                svgOutput += transformLine(elem, attrs, prefix, namespaces, context);
                changeClosingTagTo = 'polyline';
            } else if (isRectangle(elem, attrs)) {
                const result = transformRectangle(elem, attrs, prefix, namespaces, context);
                if (_.includes(result, 'polygon ')) { changeClosingTagTo = 'polygon'; }
                svgOutput += result;
            } else if (elem.toLowerCase() === 'path' ) {
                const result = transformPath(elem, attrs, prefix, namespaces, context);
                if (_.includes(result, 'polyline ')) { changeClosingTagTo = 'polyline'; }
                svgOutput += result;
            } else if (elem.toLowerCase() === 'text' && self.config.font_family !== undefined)  {
                svgOutput += transformText(elem, attrs, prefix, namespaces, context);
            } else {
                svgOutput += `<${_.isEmpty(prefix) ? '' : prefix + ':'}${elem}${toNamespaces(namespaces)}${toAttributes(attrs)}>`;
            }
        });
        cb.onEndElementNS(function(elem, prefix) {
            svgOutput += `</${_.isEmpty(prefix) ? '' : prefix + ':'}${_.isEmpty(changeClosingTagTo) ? elem : changeClosingTagTo}>`;
            changeClosingTagTo = '';
        });
        cb.onCharacters(function(chars) {
            if (!_.isEmpty(_.trim(chars))) {
                svgOutput += _.trim(_.escape(chars));
            }
        });
    });

    this.transformString = function(toBeParsed) {
        this.parser.parseString(toBeParsed);
    };

    this.transformFile= function(file) {
        this.parser.parseFile(file);
    };
};


function EmptyTransformer(callback) {
    const self = this;
    this.callback = callback;

    this.transformString = function(toBeParsed) {
        self.callback(toBeParsed);
    };

    this.transformFile = function(file) {
        return fs.readFile(file, 'UTF-8', function(err, data) {
            if (err) { throw err; }
            self.callback(data);
        });
    };
}

/**
 * {
 *   waggly: [true|false],
 *   wag_interval: 10,
 *   wag_size: 1.5,
 *   font_family: 'Purisa',
 *   font_size: 20
 *  }
 *
 * @param options { waggly: true|false }
 * @param cb callback
 * @returns {*}
 */
module.exports.create = function(options, cb) {
    if (options.waggly) {
        return new WagglyTransformer({
            waggly: options.waggly || true,
            wag_interval: options.wag_interval || 10,
            wag_size: options.wag_size || 1.5,
            font_family: options.font_family || undefined,
            font_size: options.font_size || undefined
        }, cb);
    } else {
        return new EmptyTransformer(cb);
    }
};
