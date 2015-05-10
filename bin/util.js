'use strict';
var _ = require('lodash');

var WOBBLE_INTERVAL = 10.0;
var WOBBLE_SIZE = 1.5;

var escape = function(inputToBeEscaped) {
    return inputToBeEscaped
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/\r/g, '')
        .replace(/\n/g, '')
        .replace(/>/g, '&gt;');
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

        if (dist > WOBBLE_INTERVAL) {
            var stepCount = Math.floor ( dist / WOBBLE_INTERVAL );

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

var isStraightLine = function(pointsAsString) {
    var clearedString = _.trim(pointsAsString.replace('M',' ').replace('C',' '));
    var points = stringToPoints(clearedString);

    var x = points[0].x;
    var y = points[0].y;
    var sameX = _.every(points, function(point) { return point.x === x });
    var sameY = _.every(points, function(point) { return point.y === y });

    return sameX || sameY;
};

/**
 * https://stackoverflow.com/questions/328107/how-can-you-determine-a-point-is-between-two-other-points-on-a-line-segment
 *
 * @param pointsAsString
 * @returns {boolean}
 */
var isStraightLine2 = function(pointsAsString) {
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

// ------------------------ private methods ------------------------

var _perturb = function(x, y) {
    return {
        x: x + Math.random() * WOBBLE_SIZE,
        y: y + Math.random() * WOBBLE_SIZE
    };
};

// ------------------------ expots ------------------------

module.exports.processPolygonAsString = processPolygonAsString;
module.exports.processPolygon = processPolygon;
module.exports.stringToPoints = stringToPoints;
module.exports.pointsToString = pointsToString;
module.exports.distanceBetween = distanceBetween;
module.exports.escape = escape;
module.exports.isStraightLine = isStraightLine2;
