'use strict';

var assert = require("assert");
var path = require('path');
var util = require('../bin/waggly-utils');
var fs = require('fs');
var _ = require('lodash');

describe("'waggly-utils' contain a bunch of helper-methods needed for internal calculations", function() {
    describe('distanceBetween', function () {
        it('should return 10 for a straight line of distance 10', function () {
            assert.strictEqual(util.distanceBetween({x: 0, y: 0}, {x: 10, y: 0}), 10);
        });
        it('should return sqrt(10^2 + 10^2) for a diagonal', function () {
            assert.strictEqual(util.distanceBetween({x: 0, y: 0}, {x: 10, y: 10}), 14.142135623730951);
        });
    });

    describe('processPolygon', function() {
        var config = {
            waggly: true,
            wobble_interval: 10,
            wobble_size: 1.5
        };

        it('should also accept a string-representation and transform it behind the scenes', function () {
            assert(util.processPolygon("45,54.3 13,143", config).length > 2);
        });
        it('should accept an array of points', function () {
            assert(util.processPolygon([{x:45,y:54.3},{x:23,y:143}], config).length > 2);
        });
        it('should accept an array of points', function () {
            assert(util.processPolygon([{x:0,y:0},{x:10,y:0}], config).length === 2);
            assert(util.processPolygon([{x:0,y:0},{x:20,y:0}], config).length === 3);
        });
    });
    
    describe('pointsToString', function() {
        it('should turn an array of points back to a string-representation', function() {
            assert.deepEqual(util.pointsToString([{x:45,y:54.3},{x:23,y:43}]), "45,54.3 23,43");
        });
        it('should turn an empty array of points to an empty string', function() {
            assert.deepEqual(util.pointsToString([]), "");
        });
        it('should turn undefined to an empty string', function() {
            assert.deepEqual(util.pointsToString(undefined), "");
        });
    });
    
    describe('stringToPoints', function() {
        it('should extract all values and return an object-array', function () {
            assert.deepEqual(util.stringToPoints("45,54.3 23,43"), [{x:45,y:54.3},{x:23,y:43}]);
        });
        it("shouldn't get confused when an empty string is passed in - it should only return an empty array", function () {
            assert.deepEqual(util.stringToPoints(""), []);
        });
        it("shouldn't get confused when undefined is passed in - it should only return an empty array", function () {
            assert.deepEqual(util.stringToPoints(undefined), []);
        });
        it("should also handle negative numbers correctly", function () {
            assert.deepEqual(util.stringToPoints("45,-54.4 23,-43"), [{x:45,y:-54.4},{x:23,y:-43}]);
        });
    });

    describe('processPolygonAsString', function() {
        it('should return a processed string', function () {
            assert(_.isString(util.processPolygonAsString("45,54.3 23,43", {})));
            assert(_.startsWith(util.processPolygonAsString("45,54.3 23,43", {}), "45,54.3"));
            assert(util.processPolygonAsString("45,54.3 23,43", {}).split(' ').length > 2);
        });
    });

    describe('isStraightLine', function() {
        it('should recognize a vertical line', function () {
            assert(util.isStraightLine("M93.9697,-45C114.432,-45 137.592,-45 156.47,-45"));
        });
        it('should recognize a horizontal line', function () {
            assert(util.isStraightLine("M45,-93.9697C45,-114.432 45,-137.592 45,-156.47"));
        });
        it('should recognize a diagonal line', function () {
            assert(util.isStraightLine("M377.761,-52.1332C399.799,-55.9899 427.118,-60.7706 450.044,-64.7826"));
        });
        it('should recognize a curved line as non-straight', function () {
            assert(! util.isStraightLine("M377.761,-52.1332C399.799,-65.9899 427.118,-60.7706 450.044,-64.7826"));
        });
    });
});
