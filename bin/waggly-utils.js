'use strict';

const _ = require('lodash');

const inchToPixel = (value) => value * 96;

const pixelToInch = (value) => value / 96;

const distanceBetween = (pointOne, pointTwo) => {
    const px = pointTwo.x - pointOne.x;
    const py = pointTwo.y - pointOne.y;
    return Math.sqrt(px * px + py * py);
};

const stringToPoints = function(pointsAsString) {
    if (_.isUndefined(pointsAsString) || _.isEmpty(pointsAsString)) { return []; }

    let input = pointsAsString;

    if (input.indexOf(',') >= 0) {
        // some SVG's don't separate their point-coordinates with ','
        // For those that do we have to remove 'em
        input = input.replace(/,/g,' ');
    }

    const points = _.trim(input.replace(/[A-Za-z]/g,' ')).split(/\s+/);

    const result = [];
    for (let i = 0; i < points.length; i=i+2) {
        result.push({
            x: parseFloat(points[i]),
            y: parseFloat(points[i+1])
        });
    }
    return result;
};

const processPolygon = function(polygon, config) {
    let interval = config.wag_interval || 10;
    let size = config.wag_size || 1.5;

    interval = (interval !== 0) ? interval : 10; // make sure we're positive

    interval = (config.unit=== 'in') ? pixelToInch(interval) : interval;
    size = (config.unit === 'in') ? pixelToInch(size) : size;

    const _perturb = function(x, y) {
        return {
            x: x + Math.random() * size,
            y: y + Math.random() * size
        };
    };

    const input = (_.isString(polygon)) ? stringToPoints(polygon) : polygon;

    let processedPolygon = [];
    let prev = input[0];

    processedPolygon.push(input[0]);    // push the start-point - no wobble on that

    for (let i = 1; i < input.length; ++i) {
        const nextPoint = input[i];
        const dist = distanceBetween(prev, nextPoint);

        if (dist > interval) {
            const stepCount = Math.floor ( dist / interval);

            let x  = prev.x;
            let y  = prev.y;
            const dx = ( nextPoint.x - prev.x ) / stepCount;
            const dy = ( nextPoint.y - prev.y ) / stepCount;

            for ( let count = 1; count < stepCount; ++count ) {
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

const pointsToString = function(points) {
    if (points === undefined) { return ''; }
    return _.trim(
            _.reduce(
                _.map(points, function(p) {return p.x + ',' + p.y; }),
                function(acc, elem) { return acc += ' ' + elem; },
                '')
    );
};

const processPolygonAsString = function(polygon, config) {
    return pointsToString(processPolygon(stringToPoints(polygon), config));
};

/**
 * https://stackoverflow.com/questions/328107/how-can-you-determine-a-point-is-between-two-other-points-on-a-line-segment
 *
 * @param pointsAsString
 * @returns {boolean}
 */
const isStraightLine = function(pointsAsString) {
    if (_.includes(pointsAsString.toLowerCase(), 'a') ||    // arcs are no straight lines
        _.includes(pointsAsString.toLowerCase(), 'q')) {    // quadratic bézier neither
        return false;
    }
    const points = stringToPoints(pointsAsString);
    const start = points[0];
    const end = points[points.length - 1];
    const pointsBetween = _.dropRight(_.drop(points));

    const epsilon = 0.1;

    let result = true;
    for (let i = 0; i < pointsBetween.length && result; i++) {
        const point = pointsBetween[i];
        const crossProduct = (point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);
        if (Math.abs(crossProduct) > epsilon) { result = result && false; }

        const dotProduct = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
        if (dotProduct < 0) { result = result && false; }

        const squaredLengthBa = (end.x - start.x) * (end.x - start.x) + (end.y - start.y) * (end.y - start.y);
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
