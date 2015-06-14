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

    /**
     * @param attrs
     * @param exception ...
     */
    var toAttributesExcept = function(attrs, exception) { //TODO: varargs und überflüssige Attribute weglassen (rect)
        var exceptions = _.drop(arguments);
        return toAttributes(_.filter(attrs, function(element) { return ! _.includes(exceptions, element[0]); }));
    };

    var getAttributeValue = function(attrs, needle) {
        var foundElement = _.find(attrs, function(element) { return element[0] === needle });
        return (foundElement) ? foundElement[1] : undefined;
    };

    var transformText = function(elem, attrs, prefix, namespaces, context) {
        return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
            elem +
            toNamespaces(namespaces) +
            toAttributesExcept(attrs, 'font-family', 'font-size') +
            " font-family=\"" + self.config.font_family + "\" font-size=\"" +
            ((self.config.font_size) ? self.config.font_size : "10") +
            "\" >";
    };

    var transformPolyline = function(elem, attrs, prefix, namespaces, context) {
        return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
            elem +
            toNamespaces(namespaces) +
            toAttributesExcept(attrs, 'points') +
            " points=\"" +
            util.processPolygonAsString(getAttributeValue(attrs, 'points'), _.merge(self.config, context)) +
            "\" >";
    };
    
    /**
     * <line x1="1.685" y1="-0.75" x2="2.815" y2="-0.75" stroke-width="0.0094118"/>
     */
    var transformLine = function(elem, attrs, prefix, namespaces, context) {
        var x1 = parseFloat(getAttributeValue(attrs, 'x1'));
        var y1 = parseFloat(getAttributeValue(attrs, 'y1'));
        var x2 = parseFloat(getAttributeValue(attrs, 'x2'));
        var y2 = parseFloat(getAttributeValue(attrs, 'y2'));

        var points = [{x:x1, y:y1},{x:x2,y:y2}];
        
        return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
            "polyline" +
            toNamespaces(namespaces) +
            toAttributesExcept(attrs, 'points') +
            " points=\"" +
            util.pointsToString(util.processPolygon(points, _.merge(self.config, context))) +
            "\" >";
    };

    var transformRectangle = function(elem, attrs, prefix, namespaces, context) {
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
            util.pointsToString(util.processPolygon(points, _.merge(self.config, context))) +
            "\" >";

    };

    var transformPath = function(elem, attrs, prefix, namespaces, context) {
        var path = getAttributeValue(attrs, 'd');
        if (util.isStraightLine(path)) {
            var cleared = _.trim(path.replace('M',' ').replace('C',' '));
            var points = util.stringToPoints(cleared, context.unit);
            return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
                "polyline" +
                toNamespaces(namespaces) +
                toAttributesExcept(attrs, 'd') +
                " points=\"" +
                util.pointsToString(util.processPolygon(points, _.merge(self.config, context))) +
                "\" >";
        } else { 
            return "<" + (_.isEmpty(prefix) ? '' : prefix + ":") +
                elem +
                toNamespaces(namespaces) +
                toAttributes(attrs) +
                " >";
        }
    };

    var isVisible = function(attrs) {
        var stroke = getAttributeValue(attrs, 'stroke');
        return stroke !== 'none';
    };
    
    var isPolyline = function(elem, attrs) {
        return isVisible(attrs) && (elem.toLowerCase() === 'polyline' || elem.toLowerCase() === 'polygon');            
    };
    
    var isRectangle = function(elem, attrs) {
        return isVisible(attrs) && elem.toLocaleString() === 'rect';
    };
    
    var isRootSVGElement = function(elem) {
        return elem.toLowerCase() === 'svg';
    };
    
    this.parser = new xmlParser.SaxParser(function(cb) {
        var svgOutput = "";
        var changeClosingTagTo = '';
        var context = {};

        
        cb.onStartDocument(function() {
            svgOutput = ""; 
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
                var result = transformRectangle(elem, attrs, prefix, namespaces, context);
                changeClosingTagTo = 'polygon';
                svgOutput += result;
            } else if (elem.toLowerCase() === 'path' ) {
                var result = transformPath(elem, attrs, prefix, namespaces, context);
                changeClosingTagTo = 'polyline';
                svgOutput += result;
            } else if (elem.toLowerCase() === 'text' && self.config.font_family !== undefined)  {
                svgOutput += transformText(elem, attrs, prefix, namespaces, context);
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

    this.transformString = function(toBeParsed) {
        this.parser.parseString(toBeParsed);
    };

    this.transformFile= function(file) {
        this.parser.parseFile(file);
    };
};


function EmptyTransformer(callback) {
    var self = this;
    this.callback = callback;

    this.transformString = function(toBeParsed) {
        self.callback(toBeParsed);
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
