'use strict';

var assert = require("assert");
var exec = require('child_process').exec;
var path = require('path');

describe('wsvg bin', function(){
	var cmd = 'node '+path.join(__dirname, '../bin/wsvg')+' ';
	console.log(cmd);

	it('--help should run without errors', function(done) {
		exec(cmd+'--help', function (error, stdout, stderr) {
			assert(!error);
			assert(stdout.indexOf('Usage: wsvg') > 0);
			done();
		});
	});

	it('-i without parameter should exit with error', function(done) {
		exec(cmd+'-i', function (error, stdout, stderr) {
			assert(error);
			done();
		});
	});

	it('-i with nonexisting file should exit with error', function(done) {
		exec(cmd+'-i foo.svg', function (error, stdout, stderr) {
			assert(error);
			done();
		});
	});

	it('-i with existing file should just work', function(done) {
		exec(cmd+'-i test/input.svg', function (error, stdout, stderr) {
			assert(!error);
			done();
		});
	});
	
	it('--version should run without errors', function(done) {
		exec(cmd+'--version', function (error, stdout, stderr) {
			assert(!error);
			assert.strictEqual(stdout, '0.0.7\n');
			done();
		});
	});

	it('should return error on missing command', function(done) {
        this.timeout(4000);

		exec(cmd, function (error, stdout, stderr) {
			assert(error);
			assert.equal(error.code,1);
			done();
		});

	});
});
