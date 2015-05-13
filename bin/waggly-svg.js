'use strict';
var _ = require('lodash');
var xmlParser = require('node-xml');
var fs = require('fs');
var util = require('./waggly-utils');

var WagglyTransformer = function(config, callback) {
    var self = this;
    this.callback = callback;
    this.config = config;

    var toNamespaces = function(namespaces) {
        return _.reduce(namespaces, function(a, ns) {
            return a += ((_.isEmpty(ns[0])) ? " xmlns" : " xmlns:" + ns[0]) + "=\"" + ns[1] + "\"";
        }, "");
    };

    var toAttributes = function(attrs) {
        return _.reduce(attrs, function(a, at) {return a += " " + at[0] + "=\"" + at[1] + "\"";}, "");
    };

    var toAttributesExcept = function(attrs, exception) {
        return toAttributes(_.filter(attrs, function(element) { return element[0] !== exception; }));
    };

    var getAttributeValue = function(attrs, needle) {
        var foundElement = _.find(attrs, function(element) { return element[0] === needle });
        return (foundElement) ? foundElement[1] : undefined;
    };

    var transformPolyline = function(elem, attrs, prefix, namespaces) {
        return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
            elem +
            toNamespaces(namespaces) +
            toAttributesExcept(attrs, 'points') +
            " points=\"" +
            util.processPolygonAsString(getAttributeValue(attrs, 'points'), self.config) +
            "\" >";
    };

    var transformRectangle = function(elem, attrs, prefix, namespaces) {
        var x = parseFloat(getAttributeValue(attrs, 'x'));
        var y = parseFloat(getAttributeValue(attrs, 'y'));
        var width = parseFloat(getAttributeValue(attrs, 'width'));
        var height = parseFloat(getAttributeValue(attrs, 'height'));

        var points = [{x:x, y:y},{x:x+width,y:y},{x:x+width,y:y+height},{x:x,y:y+height}];
        return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
            "polygon" +
            toNamespaces(namespaces) +
            toAttributesExcept(attrs, 'd') +
            " points=\"" +
            util.pointsToString(util.processPolygon(points, self.config)) +
            "\" >";

    };

    var transformPath = function(elem, attrs, prefix, namespaces) {
        var path = getAttributeValue(attrs, 'd');
        if (util.isStraightLine(path)) {
            var cleared = _.trim(path.replace('M',' ').replace('C',' '));
            var points = util.stringToPoints(cleared);
            return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
                "polyline" +
                toNamespaces(namespaces) +
                toAttributesExcept(attrs, 'd') +
                " points=\"" +
                util.pointsToString(util.processPolygon(points, self.config)) +
                "\" >";
        } else {
            return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
                elem +
                toNamespaces(namespaces) +
                toAttributes(attrs) +
                " >";
        }
    };

    this.parser = new xmlParser.SaxParser(function(cb) {
        var svgOutput;
        var changeClosingTagTo = '';

        cb.onStartDocument(function() { svgOutput = ""; });
        cb.onEndDocument(function() { self.callback(svgOutput); });

        cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {

            if (elem.toLowerCase() === 'polyline' || elem.toLowerCase() === 'polygon' ) {
                svgOutput += transformPolyline(elem, attrs, prefix, namespaces);
            } else if (elem.toLocaleString() === 'rect') {
                var result = transformRectangle(elem, attrs, prefix, namespaces);
                if (result.indexOf(elem) < 0) { changeClosingTagTo = 'polygon'; }
                svgOutput += result;
            } else if (elem.toLowerCase() === 'path' ) {
                var result = transformPath(elem, attrs, prefix, namespaces);
                if (result.indexOf(elem) < 0) { changeClosingTagTo = 'polyline'; }
                svgOutput += result;
            } else {
                svgOutput +="<" + (_.isEmpty(prefix) ? '' : prefix + ":") + elem + toNamespaces(namespaces) + toAttributes(attrs) + ">";
            }
        });
        cb.onEndElementNS(function(elem, prefix) {
            svgOutput += "</" +
            (_.isEmpty(prefix) ? '' : prefix + ":") +
            ((_.isEmpty(changeClosingTagTo)) ? elem : changeClosingTagTo) +
            ">";
            changeClosingTagTo = '';
        });
        cb.onCharacters(function(chars) {
            if (!_.isEmpty(_.trim(chars))) {
                svgOutput += _.trim(_.escape(chars));
            }
        });
    });

    this.transformString= function(string) {
        this.parser.parseString(string);
    };

    this.transformFile= function(file) {
        this.parser.parseFile(file);
    };
};


function EmptyTransformer(callback) {
    var self = this;
    this.callback = callback;

    this.transformString = function(string) {
        self.callback(string);
    };

    this.transformFile = function(file) {
        return fs.readFile(file, 'UTF-8', function(err, data) {
            if (err) throw err;
            self.callback(data);
        });
    }
}

/**
 * {
 *   waggly: [true|false],
 *   wobble_interval: 10,
 *   wobble_size: 1.5
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
            wobble_interval: options.wobble_interval || 10,
            wobble_size: options.wobble_size || 1.5
        }, cb);
    } else {
        return new EmptyTransformer(cb);
    }
};
