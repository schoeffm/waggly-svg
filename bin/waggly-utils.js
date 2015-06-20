'use strict';

var _ = require('lodash');

var inchToPixel = function(value) {
    return value * 96;
};

var pixelToInch = function(value) {
    return value / 96;    
};

var distanceBetween = function(pointOne, pointTwo) {
    var px = pointTwo.x - pointOne.x;
    var py = pointTwo.y - pointOne.y;
    return Math.sqrt(px * px + py * py);
};

var processPolygon = function(polygon, config) {
    var interval = config.wag_interval || 10;
    var size = config.wag_size || 1.5;

    interval = (interval !== 0) ? interval : 10; // make sure we're positive
    
    interval = (config.unit=== 'in') ? pixelToInch(interval) : interval;
    size = (config.unit === 'in') ? pixelToInch(size) : size;

    var _perturb = function(x, y) {
        return {
            x: x + Math.random() * size,
            y: y + Math.random() * size 
        };
    };

    var input = (_.isString(polygon)) ? stringToPoints(polygon) : polygon;

    var processedPolygon = [];
    var prev = input[0];

    processedPolygon.push(input[0]);    // push the start-point - no wobble on that

    for (var i = 1; i < input.length; ++i) {
        var nextPoint = input[i];
        var dist = distanceBetween(prev, nextPoint);

        if (dist > interval) {
            var stepCount = Math.floor ( dist / interval);

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

var pointsToString = function(points) {
    if (points === undefined) return "";
    return _.trim(
            _.reduce(
                _.map(points, function(p) {return p.x + "," + p.y }), 
                function(acc, elem) { return acc += " " + elem }, 
                "")
    );
};

var processPolygonAsString = function(polygon, config) {
    return pointsToString(processPolygon(stringToPoints(polygon), config));
};

var stringToPoints = function(pointsAsString, unit) {
    if (_.isUndefined(pointsAsString) || _.isEmpty(pointsAsString)) return [];

    var input = pointsAsString;

    if (input.indexOf(',') >= 0) {
        // some SVG's don't separate their point-coordinates with ','
        // For those that do we have to remove 'em
        input = input.replace(/,/g,' ')
    }

    var points = _.trim(input.replace(/[A-Za-z]/g,' ')).split(/\s+/);

    var result = [];
    for (var i = 0; i < points.length; i=i+2) {
        result.push({
            x: parseFloat(points[i]),
            y: parseFloat(points[i+1])
        })
    }
    return result;
};

/**
 * https://stackoverflow.com/questions/328107/how-can-you-determine-a-point-is-between-two-other-points-on-a-line-segment
 *
 * @param pointsAsString
 * @returns {boolean}
 */
var isStraightLine = function(pointsAsString) {
    var points = stringToPoints(pointsAsString);
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


module.exports.distanceBetween = distanceBetween;
module.exports.inchToPixel = inchToPixel;
module.exports.pixelToInch = pixelToInch;
module.exports.processPolygon = processPolygon;
module.exports.pointsToString = pointsToString;
module.exports.stringToPoints = stringToPoints;
module.exports.isStraightLine = isStraightLine;
module.exports.processPolygonAsString = processPolygonAsString;
