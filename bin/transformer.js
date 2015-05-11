'use strict';
var _ = require('lodash');
var xmlParser = require('node-xml');
var fs = require('fs');

var WagglyTransformer = function(config, callback) {
    var self = this;
    this.callback = callback;
    this.config = config;

    var distanceBetween = function(pointOne, pointTwo) {
        var px = pointTwo.x - pointOne.x;
        var py = pointTwo.y - pointOne.y;
        return Math.sqrt(px * px + py * py);
    };

    var processPolygonAsString = function(polygon) {
        return pointsToString(processPolygon(stringToPoints(polygon)));
    };

    var processPolygon = function(polygon) {

        var input = (_.isString(polygon)) ? stringToPoints(polygon) : polygon;

        var processedPolygon = [];
        var prev = input[0];

        processedPolygon.push(input[0]);    // push the start-point - no wobble on that

        for (var i = 1; i < input.length; ++i) {
            var nextPoint = input[i];
            var dist = distanceBetween(prev, nextPoint);

            if (dist > self.config.wobble_interval) {
                var stepCount = Math.floor ( dist / self.config.wobble_interval);

                var x  = prev.x;
                var y  = prev.y;
                var dx = ( nextPoint.x - prev.x ) / stepCount;
                var dy = ( nextPoint.y - prev.y ) / stepCount;

                for ( var count = 1; count < stepCount; ++count ) {
                    x += dx;
                    y += dy;

                    processedPolygon.push ( _perturb( x, y ) );
                }
            }
            processedPolygon.push ( _perturb( nextPoint.x, nextPoint.y ) );
            prev = nextPoint;
        }
        return processedPolygon;
    };

    /**
     * https://stackoverflow.com/questions/328107/how-can-you-determine-a-point-is-between-two-other-points-on-a-line-segment
     *
     * @param pointsAsString
     * @returns {boolean}
     */
    var isStraightLine = function(pointsAsString) {
        var clearedString = _.trim(pointsAsString.replace('M',' ').replace('C',' '));
        var points = stringToPoints(clearedString);
        var start = points[0];
        var end = points[points.length - 1];
        var pointsBetween = _.dropRight(_.drop(points));

        var epsilon = 0.1;

        var result = true;

        for (var i = 0; i < pointsBetween.length && result; i++) {
            var point = pointsBetween[i];
            var crossProduct = (point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);
            if (Math.abs(crossProduct) > epsilon) { result = result && false; }

            var dotProduct = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
            if (dotProduct < 0) { result = result && false; }

            var squaredLengthBa = (end.x - start.x) * (end.x - start.x) + (end.y - start.y) * (end.y - start.y);
            if (dotProduct > squaredLengthBa) { result = result && false; }

            result = result && true;
        }
        return result;
    };

    var pointsToString = function(points) {
        return _.trim(_.map(points, function(p) { return p.x + "," + p.y + " "}));
    };

    var stringToPoints = function(pointsAsString) {
        if (_.isUndefined(pointsAsString) || _.isEmpty(pointsAsString)) return [];

        var points = pointsAsString.split(" ");
        return _.map(points, function(char) {
            return {
                x: parseFloat(char.split(",")[0]),
                y: parseFloat(char.split(",")[1])
            };
        });
    };

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
            processPolygonAsString(getAttributeValue(attrs, 'points')) +
            "\" >";
    };

    var transformPath = function(elem, attrs, prefix, namespaces) {
        var path = getAttributeValue(attrs, 'd');
        if (isStraightLine(path)) {
            var cleared = _.trim(path.replace('M',' ').replace('C',' '));
            var points = stringToPoints(cleared);
            return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
                "polyline" +
                toNamespaces(namespaces) +
                toAttributesExcept(attrs, 'd') +
                " points=\"" +
                pointsToString(processPolygon(points)) +
                "\" >";
        } else {
            return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
                elem +
                toNamespaces(namespaces) +
                toAttributes(attrs) +
                " >";
        }
    };

    var _perturb = function(x, y) {
        return {
            x: x + Math.random() * self.config.wobble_size,
            y: y + Math.random() * self.config.wobble_size
        };
    };

    this.parser = new xmlParser.SaxParser(function(cb) {
        var svgOutput;
        var changeClosingTagTo = '';

        cb.onStartDocument(function() { svgOutput = ""; });
        cb.onEndDocument(function() { self.callback(svgOutput); });

        cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {

            if (elem.toLowerCase() === 'polyline' || elem.toLowerCase() === 'polygon' ) {
                svgOutput += transformPolyline(elem, attrs, prefix, namespaces);
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
        return fs.readFile(file, function(err, data) {
            if (err) throw err;
            self.callback(data);
        });
    }
}

/**
 * { waggly: true|false }
 *
 * @param options { waggly: true|false }
 * @param cb callback
 * @returns {*}
 */
module.exports.create = function(options, cb) {
    if (options.waggly) {
        return new WagglyTransformer(options, cb);
    } else {
        return new EmptyTransformer(cb);
    }
};
