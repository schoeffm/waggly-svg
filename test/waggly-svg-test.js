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
    var testText = '<ns0:text font-family="Purisa" font-size="10.00" text-anchor="middle" x="42" y="-67.5">ICustomer</ns0:text>';
    var testLine = '<line x1="1.685" y1="-0.75" x2="2.815" y2="-0.75" stroke-width="0.0094118"/>';

    describe('When wagging is turned off, it', function() {
        it('should create a pass-through object that returns the input-string unchanged', function(done) {
            var transformer = wagglySvg.create({ waggly: false }, function(result) {
                assert.strictEqual(result, testPolyline);
                done();
            });
            transformer.transformString(testPolyline);
        });

        it('should create a pass-through object that returns the input-file unchanged', function(done) {
            var inputFile = 'test/input.svg';
            var transformer = wagglySvg.create({ waggly: false }, function(result) {
                assert.strictEqual(
                    result,
                    fs.readFileSync(inputFile, 'UTF-8'));
                done();
            });
            transformer.transformFile(inputFile);
        });
    });

    describe('When wagging is turned on and ...', function() {
        var config = {
            waggly: true,
            wag_interval: 10,
            wag_size: 1.5,
            font_family: "TestFont"
        };
        describe('when exploring a "polyline"-node it ...', function() {
            it('should turn a polyline into a waggling polyline even without config', function (done) {
                var transformer = wagglySvg.create({waggly: true}, function (result) {
                    assert.notStrictEqual(result, testPolyline);
                    assert.strictEqual(result.split(' ').length, 13);
                    done();
                });
                transformer.transformString(testPolyline);
            });

            it('should turn a polyline into a waggling polyline', function (done) {
                var transformer = wagglySvg.create(config, function (result) {
                    assert.notStrictEqual(result, testPolyline);
                    assert.strictEqual(result.split(' ').length, 13);
                    done();
                });
                transformer.transformString(testPolyline);
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

        describe('when exploring a "polygon"-node it ...', function() {
            it('should turn a polygon into a waggling polygon', function (done) {
                var transformer = wagglySvg.create(config, function (result) {
                    assert.notStrictEqual(result, testPolygon);
                    assert.strictEqual(result.split(' ').length, 31);
                    done();
                });
                transformer.transformString(testPolygon);
            });
        });
        
        describe('when exploring a "path"-node it ...', function() {
            it('should change a straight horizontal path into a waggling polyline', function (done) {
                var transformer = wagglySvg.create(config, function (result) {
                    assert.notStrictEqual(result, testPathStraightHorizontal);
                    assert(result.indexOf('polyline') >= 0);
                    assert(result.indexOf('path') < 0);
                    assert.strictEqual(result.split(' ').length, 8);
                    done();
                });
                transformer.transformString(testPathStraightHorizontal);
            });

            it('should change a straight diagonal path into a waggling polyline', function (done) {
                var transformer = wagglySvg.create(config, function (result) {
                    assert.notStrictEqual(result, testPathStraightDiagonal);
                    assert(result.indexOf('polyline') >= 0);
                    assert(result.indexOf('path') < 0);
                    assert.strictEqual(result.split(' ').length, 8);
                    done();
                });
                transformer.transformString(testPathStraightDiagonal);
            });
        });

        describe('when exploring a "rect"-node it ...', function() {
            it('should change a rectangle into a waggling polygon', function (done) {
                var transformer = wagglySvg.create(config, function (result) {
                    assert.notStrictEqual(result, testRectangle);
                    assert(result.indexOf('polygon') >= 0);
                    assert(result.indexOf('rect') < 0);
                    assert.strictEqual(result.split(' ').length, 42);
                    done();
                });
                transformer.transformString(testRectangle);
            });
        });

        describe('when exploring a "line"-node it ...', function() {
            it('should change a line into a waggling polyline', function (done) {
                var transformer = wagglySvg.create(config, function (result) {
                    assert.notStrictEqual(result, testLine);
                    assert(result.indexOf('polyline') >= 0);
                    assert(result.indexOf('<line') < 0);
                    assert.strictEqual(result.split(' ').length, 9);
                    done();
                });
                transformer.transformString(testLine);
            });
        });

        
        
        describe('when exploring a "text"-node it ...', function() {
            it('should take the given font-family and replace it on the input', function(done) {
                var transformer = wagglySvg.create(config, function(result) {
                    assert.strictEqual(result, '<ns0:text text-anchor="middle" x="42" y="-67.5" font-family="TestFont" font-size="10" >ICustomer</ns0:text>');
                    done();
                });
                transformer.transformString(testText);
            });
            
            it('should take the given font-size and replace it on the input (as long as a font-family is set)', function(done) {
                var config = {
                    waggly: true,
                    wag_interval: 30,
                    wag_size: 1.5,
                    font_family: "TestFont",
                    font_size: 12
                };
                var transformer = wagglySvg.create(config, function(result) {
                    assert.strictEqual(result, '<ns0:text text-anchor="middle" x="42" y="-67.5" font-family="TestFont" font-size="12" >ICustomer</ns0:text>');
                    done();
                });
                transformer.transformString(testText);
            });
        });
    });
});
