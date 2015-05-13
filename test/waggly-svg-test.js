'use strict';

var assert = require("assert");
var exec = require('child_process').exec;
var path = require('path');
var wagglySvg = require('../bin/waggly-svg');
var fs = require('fs');
var _ = require('lodash');

describe("'waggly-svg' encapsulates the whole svg-transformation", function() {

    var testPolygon = '<ns0:polygon fill="white" points="0.500000,-10.500000 0.519792,-68.184375 0.500000,-79.500000 46.268750,-79.505208 83.500000,-79.500000 83.488542,-20.397917 83.500000,-10.500000 64.827083,-10.515625 0.500000,-10.500000" stroke="black"/>';
    var testPolyline = '<ns0:polyline fill="none" points="0.500000,-60.500000 79.702083,-60.489583 83.500000,-60.500000" stroke="black"/>';
    var testPathStraightHorizontal = '<ns0:path d="M245.84,-45C262.291,-45 280.343,-45 295.875,-45" fill="none" stroke="black"/>';
    var testPathStraightDiagonal = '<ns0:path d="M245.84,-45C262.291,-45 280.343,-45 295.875,-45" fill="none" stroke="black"/>';
    var testRectangle = '<rect fill="none" stroke="#000000" stroke-opacity="1" stroke-width="1" x="366.47" y="-1002.365" width="135.06" height="36.296" rx="0.506" ry="0.506"/>';

    describe('When wagging is turned off, it', function() {
        it('should create a pass-through object that returns the input-string unchanged', function(done) {
            var transformer = wagglySvg.create({ waggly: false }, function(result) {
                assert.strictEqual(result, testPolyline);
                done();
            });
            transformer.transformString(testPolyline);
        });

        it.skip('should create a pass-through object that returns the input-file unchanged', function(done) {
            var inputFile = './input.svg';
            var transformer = wagglySvg.create({ waggly: false }, function(result) {
                assert.strictEqual(
                    result,
                    fs.readFileSync(inputFile, 'UTF-8'));
                done();
            });
            transformer.transformFile(inputFile);
        });
    });

    describe('When wagging is turned on, it', function() {
        var config = {
            waggly: true,
            wag_interval: 10,
            wag_size: 1.5
        };

        it('should turn a polyline into a waggling polyline even without config', function(done) {
            var transformer = wagglySvg.create({waggly:true}, function(result) {
                assert.notStrictEqual(result, testPolyline);
                assert.strictEqual(result.split(' ').length, 13);
                done();
            });
            transformer.transformString(testPolyline);
        });

        it('should turn a polyline into a waggling polyline', function(done) {
            var transformer = wagglySvg.create(config, function(result) {
                assert.notStrictEqual(result, testPolyline);
                assert.strictEqual(result.split(' ').length, 13);
                done();
            });
            transformer.transformString(testPolyline);
        });

        it('should change a straight horizontal path into a waggling polyline', function(done) {
            var transformer = wagglySvg.create(config, function(result) {
                assert.notStrictEqual(result, testPathStraightHorizontal);
                assert(result.indexOf('polyline') >= 0);
                assert(result.indexOf('path') < 0);
                assert.strictEqual(result.split(' ').length, 8);
                done();
            });
            transformer.transformString(testPathStraightHorizontal);
        });

        it('should change a straight diagonal path into a waggling polyline', function(done) {
            var transformer = wagglySvg.create(config, function(result) {
                assert.notStrictEqual(result, testPathStraightDiagonal);
                assert(result.indexOf('polyline') >= 0);
                assert(result.indexOf('path') < 0);
                assert.strictEqual(result.split(' ').length, 8);
                done();
            });
            transformer.transformString(testPathStraightDiagonal);
        });

        it('should change a rectangle into a waggling polygon', function(done) {
            var transformer = wagglySvg.create(config, function(result) {
                assert.notStrictEqual(result, testRectangle);
                assert(result.indexOf('polygon') >= 0);
                assert(result.indexOf('rect') < 0);
                assert.strictEqual(result.split(' ').length, 42);
                done();
            });
            transformer.transformString(testRectangle);
        });

        it('should turn a polygon into a waggling polygon', function(done) {
            var transformer = wagglySvg.create(config, function(result) {
                assert.notStrictEqual(result, testPolygon);
                assert.strictEqual(result.split(' ').length, 31);
                done();
            });
            transformer.transformString(testPolygon);
        });


        it('should produce less intermediate points when using a bigger interval (but still waggly)', function(done) {
            var config = {
                waggly: true,
                wag_interval: 30,
                wag_size: 1.5
            };
            var transformer = wagglySvg.create(config, function(result) {
                assert.notStrictEqual(result, testPolyline);
                assert.strictEqual(result.split(' ').length, 8);
                done();
            });
            transformer.transformString(testPolyline);
        });
    });
});
