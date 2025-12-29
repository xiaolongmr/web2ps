$$/*
* SVG Import Script for Photoshop
* Changed by Anlv
*/

(function () {

// 设置变量：控制是否在现有活动文档中加载SVG路径
var loadInActiveDocument = {insertMode}; // 设置为 true 在活动文档中加载，false 新建文档

function SvgPath(path) {
    if (!(this instanceof SvgPath)) { 
        return new SvgPath(path);
    }
    var pstate = pathParse(path);
    this.segments = pstate.segments;
    this.err = pstate.err;
    this.__stack = [];
}

function isSpace(ch) {
    return (((((((((ch === 10) || (ch === 13)) || (ch === 8232)) || (ch === 8233)) || (ch === 32)) || (ch === 9)) || (ch === 11)) || (ch === 12)) || (ch === 160)) || ((ch >= 5760) && (SPECIAL_SPACES.indexOf(ch) >= 0));
}

function isCommand(code) {
    switch (code | 32) { 
        case 109:
        case 122:
        case 108:
        case 104:
        case 118:
        case 99:
        case 115:
        case 113:
        case 116:
        case 97:
        case 114:
            return true;
    }
    return false;
}

function isDigit(code) {
    return (code >= 48) && (code <= 57);
}

function State(path) {
    this.index = 0;
    this.path = path;
    this.max = path.length;
    this.result = [];
    this.param = 0;
    this.err = "";
    this.segmentStart = 0;
    this.data = [];
}

function skipSpaces(state) {
    while ((state.index < state.max) && (isSpace(state.path.charCodeAt(state.index)))) {
        state.index++;
    }
}

function scanParam(state) {
    var start = state.index;
    var index = start;
    var max = state.max;
    var zeroFirst = false;
    var ch = state.path.charCodeAt(index);
    
    if ((ch === 43) || (ch === 45)) { 
        index++;
        ch = index < max ? state.path.charCodeAt(index) : 0;
    }
    
    if ((!isDigit(ch)) && (ch !== 46)) { 
        state.err = "SvgPath: param should start with 0..9 or `.` (at pos " + index + ")";
        return;
    }
    
    if (ch !== 46) { 
        zeroFirst = ch === 48;
        index++;
        ch = index < max ? state.path.charCodeAt(index) : 0;
        
        if ((zeroFirst) && (index < max)) { 
            if ((ch) && (isDigit(ch))) { 
                state.err = "SvgPath: numbers started with `0` such as `09` are ilegal (at pos " + start + ")";
                return;
            }
        }
        
        while ((index < max) && (isDigit(state.path.charCodeAt(index)))) {
            index++;
        }
        
        ch = index < max ? state.path.charCodeAt(index) : 0;
    }
    
    if (ch === 46) { 
        index++;
        while (isDigit(state.path.charCodeAt(index))) {
            index++;
        }
        ch = index < max ? state.path.charCodeAt(index) : 0;
    }
    
    if ((ch === 101) || (ch === 69)) { 
        index++;
        ch = index < max ? state.path.charCodeAt(index) : 0;
        
        if ((ch === 43) || (ch === 45)) { 
            index++;
        }
        
        if ((index < max) && (isDigit(state.path.charCodeAt(index)))) { 
            while ((index < max) && (isDigit(state.path.charCodeAt(index)))) {
                index++;
            }
        } else {
            state.err = "SvgPath: invalid float exponent (at pos " + index + ")";
            return;
        }
    }
    
    state.index = index;
    state.param = parseFloat(state.path.slice(start, index)) + 0;
}

function finalizeSegment(state) {
    var cmd = state.path[state.segmentStart];
    var cmdLC = cmd.toLowerCase();
    var params = state.data;
    
    if ((cmdLC === "m") && (params.length > 2)) { 
        state.result.push([cmd, params[0], params[1]]);
        params = params.slice(2);
        cmdLC = "l";
        cmd = cmd === "m" ? "l" : "L";
    }
    
    if (cmdLC === "r") { 
        state.result.push([cmd].concat(params));
    } else {
        while (params.length >= paramCounts[cmdLC]) {
            state.result.push([cmd].concat(params.splice(0, paramCounts[cmdLC])));
            if (!paramCounts[cmdLC]) { 
                break;
            }
        }
    }
}

function scanSegment(state) {
    var max = state.max;
    state.segmentStart = state.index;
    var cmdCode = state.path.charCodeAt(state.index);
    
    if (!isCommand(cmdCode)) { 
        state.err = "SvgPath: bad command " + state.path[state.index] + " (at pos " + state.index + ")";
        return;
    }
    
    state.index++;
    skipSpaces(state);
    state.data = [];
    var comma_found = false;
    
    while ((state.index < max) || (comma_found)) {
        if (!comma_found) { 
            if (isCommand(state.path.charCodeAt(state.index))) { 
                break;
            }
        }
        
        scanParam(state);
        
        if (state.err.length) { 
            return;
        }
        
        state.data.push(state.param);
        skipSpaces(state);
        comma_found = false;
        
        if ((state.index < max) && (state.path.charCodeAt(state.index) === 44)) { 
            state.index++;
            skipSpaces(state);
            comma_found = true;
        }
    }
    
    finalizeSegment(state);
}

function pathParse(svgPath) {
    var state = new State(svgPath);
    var max = state.max;
    
    skipSpaces(state);
    
    while ((state.index < max) && (!state.err.length)) {
        scanSegment(state);
    }
    
    if (state.err.length) { 
        state.result = [];
    } else {
        if (state.result.length) { 
            if ("mM".indexOf(state.result[0][0]) < 0) { 
                state.err = "SvgPath: string should start with `M` or `m`";
                state.result = [];
            } else {
                state.result[0][0] = "M";
            }
        }
    }
    
    return {err: state.err, segments: state.result};
}

function vector_angle(ux, uy, vx, vy) {
    var sign = ((ux * vy) - (uy * vx)) < 0 ? -1 : 1;
    var umag = Math.sqrt((ux * ux) + (uy * uy));
    var vmag = Math.sqrt((vx * vx) + (vy * vy));
    var dot = (ux * vx) + (uy * vy);
    var div = dot / (umag * vmag);
    
    if ((div > 1) || (div < -1)) { 
        div = Math.max(div, -1);
        div = Math.min(div, 1);
    }
    
    return sign * Math.acos(div);
}

function correct_radii(midx, midy, rx, ry) {
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    var λ = ((midx * midx) / (rx * rx)) + ((midy * midy) / (ry * ry));
    
    if (λ > 1) { 
        rx *= Math.sqrt(λ);
        ry *= Math.sqrt(λ);
    }
    
    return [rx, ry];
}

function get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ) {
    var x1p = ((cos_φ * (x1 - x2)) / 2) + ((sin_φ * (y1 - y2)) / 2);
    var y1p = ((-sin_φ * (x1 - x2)) / 2) + ((cos_φ * (y1 - y2)) / 2);
    var rx_sq = rx * rx;
    var ry_sq = ry * ry;
    var x1p_sq = x1p * x1p;
    var y1p_sq = y1p * y1p;
    var radicant = ((rx_sq * ry_sq) - (rx_sq * y1p_sq)) - (ry_sq * x1p_sq);
    
    if (radicant < 0) { 
        radicant = 0;
    }
    
    radicant /= ((rx_sq * y1p_sq) + (ry_sq * x1p_sq));
    radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);
    var cxp = ((radicant * rx) / ry) * y1p;
    var cyp = ((radicant * -ry) / rx) * x1p;
    var cx = ((cos_φ * cxp) - (sin_φ * cyp)) + ((x1 + x2) / 2);
    var cy = (sin_φ * cxp) + (cos_φ * cyp) + ((y1 + y2) / 2);
    var v1x = (x1p - cxp) / rx;
    var v1y = (y1p - cyp) / ry;
    var v2x = (-x1p - cxp) / rx;
    var v2y = (-y1p - cyp) / ry;
    var θ1 = vector_angle(1, 0, v1x, v1y);
    var Δθ = vector_angle(v1x, v1y, v2x, v2y);
    
    if ((fs === 0) && (Δθ > 0)) { 
        Δθ -= TAU;
    }
    
    if ((fs === 1) && (Δθ < 0)) { 
        Δθ += TAU;
    }
    
    return [cx, cy, θ1, Δθ];
}

function approximate_unit_arc(θ1, Δθ) {
    var α = 1.3333333333333333 * Math.tan(Δθ / 4);
    var x1 = Math.cos(θ1);
    var y1 = Math.sin(θ1);
    var x2 = Math.cos(θ1 + Δθ);
    var y2 = Math.sin(θ1 + Δθ);
    
    return [x1, y1, x1 - (y1 * α), y1 + (x1 * α), x2 + (y2 * α), y2 - (x2 * α), x2, y2];
}

function a2c(x1, y1, x2, y2, fa, fs, rx, ry, φ) {
    var sin_φ = Math.sin((φ * TAU) / 360);
    var cos_φ = Math.cos((φ * TAU) / 360);
    var x1p = ((cos_φ * (x1 - x2)) / 2) + ((sin_φ * (y1 - y2)) / 2);
    var y1p = ((-sin_φ * (x1 - x2)) / 2) + ((cos_φ * (y1 - y2)) / 2);
    
    if ((x1p === 0) && (y1p === 0)) { 
        return [];
    }
    
    if ((rx === 0) || (ry === 0)) { 
        return [];
    }
    
    var radii = correct_radii(x1p, y1p, rx, ry);
    rx = radii[0];
    ry = radii[1];
    
    var cc = get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ);
    var result = [];
    var θ1 = cc[2];
    var Δθ = cc[3];
    
    var segments = Math.max(Math.ceil(Math.abs(Δθ) / (TAU / 4)), 1);
    Δθ /= segments;
    
    for (var i = 0; i < segments; i += 1) { 
        result.push(approximate_unit_arc(θ1, Δθ));
        θ1 += Δθ;
    }
    
    return result.map(function (curve) {
        for (var i = 0; i < curve.length; i += 2) { 
            var x = curve[i + 0];
            var y = curve[i + 1];
            x *= rx;
            y *= ry;
            var xp = (cos_φ * x) - (sin_φ * y);
            var yp = (sin_φ * x) + (cos_φ * y);
            curve[i + 0] = xp + cc[0];
            curve[i + 1] = yp + cc[1];
        }
        return curve;
    });
}

function transformParse(transformString) {
    var matrix = new Matrix();
    var cmd = '';
    var splitString = transformString.split(/(matrix|translate|scale|rotate|skewX|skewY)/);
    
    splitString.forEach(function (item) {
        item = item.replace("(", "");
        item = item.replace(")", "");
        item = item.replace(/\s*$/, "");
        item = item.replace(/^\s*/, "");
        item = item.replace(/\s+/g, " ");
        
        if (!item.length) { 
            return;
        }
        
        if (typeof operations[item] !== "undefined") { 
            cmd = item;
            return;
        }
        
        var params = item.split(PARAMS_SPLIT_RE).map(function (i) {
            return parseFloat(i) || 0;
        });
        
        switch (cmd) { 
            case "matrix":
                if (params.length === 6) { 
                    matrix.matrix(params);
                }
                return;
            case "scale":
                if (params.length === 1) { 
                    matrix.scale(params[0], params[0]);
                } else if (params.length === 2) { 
                    matrix.scale(params[0], params[1]);
                }
                return;
            case "rotate":
                if (params.length === 1) { 
                    matrix.rotate(params[0], 0, 0);
                } else if (params.length === 3) { 
                    matrix.rotate(params[0], params[1], params[2]);
                }
                return;
            case "translate":
                if (params.length === 1) { 
                    matrix.translate(params[0], 0);
                } else if (params.length === 2) { 
                    matrix.translate(params[0], params[1]);
                }
                return;
            case "skewX":
                if (params.length === 1) { 
                    matrix.skewX(params[0]);
                }
                return;
            case "skewY":
                if (params.length === 1) { 
                    matrix.skewY(params[0]);
                }
                return;
        }
    });
    
    return matrix;
}

function combine(m1, m2) {
    return [
        (m1[0] * m2[0]) + (m1[2] * m2[1]), 
        (m1[1] * m2[0]) + (m1[3] * m2[1]), 
        (m1[0] * m2[2]) + (m1[2] * m2[3]), 
        (m1[1] * m2[2]) + (m1[3] * m2[3]), 
        (m1[0] * m2[4]) + (m1[2] * m2[5]) + m1[4], 
        (m1[1] * m2[4]) + (m1[3] * m2[5]) + m1[5]
    ];
}

function Matrix() {
    if (!(this instanceof Matrix)) { 
        return new Matrix();
    }
    this.queue = [];
    this.cache = null;
}

function getById(arr, value) {
    for (var i = 0, iLen = arr.length; i < iLen; i++) { 
        if (arr[i].id == value) { 
            return arr[i];
        }
    }
}

function colourNameToHex(colour) {
    var colours = {
        aliceblue: "f0f8ff", antiquewhite: "faebd7", aqua: "00ffff", aquamarine: "7fffd4", 
        azure: "f0ffff", beige: "f5f5dc", bisque: "ffe4c4", black: "000000", 
        blanchedalmond: "ffebcd", blue: "0000ff", blueviolet: "8a2be2", brown: "a52a2a", 
        burlywood: "deb887", cadetblue: "5f9ea0", chartreuse: "7fff00", chocolate: "d2691e", 
        coral: "ff7f50", cornflowerblue: "6495ed", cornsilk: "fff8dc", crimson: "dc143c", 
        cyan: "00ffff", darkblue: "00008b", darkcyan: "008b8b", darkgoldenrod: "b8860b", 
        darkgray: "a9a9a9", darkgreen: "006400", darkkhaki: "bdb76b", darkmagenta: "8b008b", 
        darkolivegreen: "556b2f", darkorange: "ff8c00", darkorchid: "9932cc", darkred: "8b0000", 
        darksalmon: "e9967a", darkseagreen: "8fbc8f", darkslateblue: "483d8b", darkslategray: "2f4f4f", 
        darkturquoise: "00ced1", darkviolet: "9400d3", deeppink: "ff1493", deepskyblue: "00bfff", 
        dimgray: "696969", dodgerblue: "1e90ff", firebrick: "b22222", floralwhite: "fffaf0", 
        forestgreen: "228b22", fuchsia: "ff00ff", gainsboro: "dcdcdc", ghostwhite: "f8f8ff", 
        gold: "ffd700", goldenrod: "daa520", gray: "808080", green: "008000", 
        greenyellow: "adff2f", honeydew: "f0fff0", hotpink: "ff69b4", "indianred ": "cd5c5c", 
        indigo: "4b0082", ivory: "fffff0", khaki: "f0e68c", lavender: "e6e6fa", 
        lavenderblush: "fff0f5", lawngreen: "7cfc00", lemonchiffon: "fffacd", lightblue: "add8e6", 
        lightcoral: "f08080", lightcyan: "e0ffff", lightgoldenrodyellow: "fafad2", lightgreen: "90ee90", 
        lightgrey: "d3d3d3", lightpink: "ffb6c1", lightsalmon: "ffa07a", lightseagreen: "20b2aa", 
        lightskyblue: "87cefa", lightslategray: "778899", lightsteelblue: "b0c4de", lightyellow: "ffffe0", 
        lime: "00ff00", limegreen: "32cd32", linen: "faf0e6", magenta: "ff00ff", 
        maroon: "800000", mediumaquamarine: "66cdaa", mediumblue: "0000cd", mediumorchid: "ba55d3", 
        mediumpurple: "9370d8", mediumseagreen: "3cb371", mediumslateblue: "7b68ee", mediumspringgreen: "00fa9a", 
        mediumturquoise: "48d1cc", mediumvioletred: "c71585", midnightblue: "191970", mintcream: "f5fffa", 
        mistyrose: "ffe4e1", moccasin: "ffe4b5", navajowhite: "ffdead", navy: "000080", 
        none: "000000", oldlace: "fdf5e6", olive: "808000", olivedrab: "6b8e23", 
        orange: "ffa500", orangered: "ff4500", orchid: "da70d6", palegoldenrod: "eee8aa", 
        palegreen: "98fb98", paleturquoise: "afeeee", palevioletred: "d87093", papayawhip: "ffefd5", 
        peachpuff: "ffdab9", peru: "cd853f", pink: "ffc0cb", plum: "dda0dd", 
        powderblue: "b0e0e6", purple: "800080", red: "ff0000", rosybrown: "bc8f8f", 
        royalblue: "4169e1", saddlebrown: "8b4513", salmon: "fa8072", sandybrown: "f4a460", 
        seagreen: "2e8b57", seashell: "fff5ee", sienna: "a0522d", silver: "c0c0c0", 
        skyblue: "87ceeb", slateblue: "6a5acd", slategray: "708090", snow: "fffafa", 
        springgreen: "00ff7f", steelblue: "4682b4", tan: "d2b48c", teal: "008080", 
        thistle: "d8bfd8", tomato: "ff6347", turquoise: "40e0d0", violet: "ee82ee", 
        wheat: "f5deb3", white: "ffffff", whitesmoke: "f5f5f5", yellow: "ffff00", 
        yellowgreen: "9acd32"
    };
    
    if (typeof colours[colour.toLowerCase()] != "undefined") { 
        return colours[colour.toLowerCase()];
    }
    
    return "000000";
}

// Polyfills
if (typeof String.prototype.startsWith != "function") { 
    String.prototype.startsWith = function (str) {
        return this.slice(0, str.length) == str;
    };
}

if (!Array.isArray) { 
    Array.isArray = function (arg) {
        return Object.prototype.toString.call(arg) === "[object Array]";
    };
}

if (!String.prototype.trim) { 
    String.prototype.trim = function () {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
    };
}

if (!Array.prototype.forEach) { 
    Array.prototype.forEach = function (callback, thisArg) {
        if (this == null) { 
            throw new TypeError("this is null or not defined");
        }
        
        var O = Object(this);
        var len = O.length >>> 0;
        
        if (typeof callback !== "function") { 
            throw new TypeError(callback + " is not a function");
        }
        
        var T;
        if (arguments.length > 1) { 
            T = thisArg;
        }
        
        var k = 0;
        while (k < len) {
            if (k in O) { 
                var kValue = O[k];
                callback.call(T, kValue, k, O);
            }
            k++;
        }
    };
}

if (!Array.prototype.map) { 
    Array.prototype.map = function (callback, thisArg) {
        if (this == null) { 
            throw new TypeError("this is null or not defined");
        }
        
        var O = Object(this);
        var len = O.length >>> 0;
        
        if (typeof callback !== "function") { 
            throw new TypeError(callback + " is not a function");
        }
        
        var T;
        if (arguments.length > 1) { 
            T = thisArg;
        }
        
        var A = new Array(len);
        var k = 0;
        
        while (k < len) {
            if (k in O) { 
                var kValue = O[k];
                var mappedValue = callback.call(T, kValue, k, O);
                A[k] = mappedValue;
            }
            k++;
        }
        
        return A;
    };
}

SvgPath.prototype.__matrix = function (m) {
    var self = this;
    var ma, sx, sy, angle, arc2line;
    
    if (!m.queue.length) { 
        return;
    }
    
    this.iterate(function (s, index, x, y) {
        var result, p, name;
        
        switch (s[0]) { 
            case "v":
                p = m.calc(0, s[1], true);
                result = p[0] === 0 ? ["v", p[1]] : ["l", p[0], p[1]];
                break;
                
            case "V":
                p = m.calc(x, s[1], false);
                result = p[0] === m.calc(x, y, false)[0] ? ["V", p[1]] : ["L", p[0], p[1]];
                break;
                
            case "h":
                p = m.calc(s[1], 0, true);
                result = p[1] === 0 ? ["h", p[0]] : ["l", p[0], p[1]];
                break;
                
            case "H":
                p = m.calc(s[1], y, false);
                result = p[1] === m.calc(x, y, false)[1] ? ["H", p[0]] : ["L", p[0], p[1]];
                break;
                
            case "a":
            case "A":
                if ((((s[0] === "A") && (s[6] === x)) && (s[7] === y)) || (((s[0] === "a") && (s[6] === 0)) && (s[7] === 0))) { 
                    return [];
                }
                
                if (!ma) { 
                    ma = m.toArray();
                    sx = Math.sqrt(Math.pow(ma[0], 2) + Math.pow(ma[2], 2));
                    arc2line = true;
                    
                    if (sx !== 0) { 
                        sy = ((ma[0] * ma[3]) - (ma[1] * ma[2])) / sx;
                        
                        if (sy !== 0) { 
                            if (ma[0] === 0) { 
                                angle = ma[1] < 0 ? -90 : 90;
                            } else {
                                angle = (Math.atan(ma[1] / ma[0]) * 180) / Math.PI;
                            }
                            arc2line = false;
                        }
                    }
                }
                
                if (((arc2line) || (s[1] === 0)) || (s[2] === 0)) { 
                    p = m.calc(s[6], s[7], s[0] === "a");
                    result = [s[0] === "a" ? "l" : "L", p[0], p[1]];
                    break;
                }
                
                result = s.slice();
                result[1] = s[1] * sx;
                result[2] = s[2] * sy;
                result[3] = (s[3] + angle) % 360;
                p = m.calc(s[6], s[7], s[0] === "a");
                result[6] = p[0];
                result[7] = p[1];
                break;
                
            default:
                name = s[0];
                result = [name];
                var isRelative = name.toLowerCase() === name;
                
                for (var i = 1; i < s.length; i += 2) { 
                    p = m.calc(s[i], s[i + 1], isRelative);
                    result.push(p[0], p[1]);
                }
        }
        
        self.segments[index] = result;
    }, true);
};

SvgPath.prototype.__evaluateStack = function () {
    if (!this.__stack.length) { 
        return;
    }
    
    if (this.__stack.length === 1) { 
        this.__matrix(this.__stack[0]);
        this.__stack = [];
        return;
    }
    
    var m = new Matrix();
    var i = this.__stack.length;
    
    while (--i >= 0) {
        m.matrix(this.__stack[i].toArray());
    }
    
    this.__matrix(m);
    this.__stack = [];
};

SvgPath.prototype.toString = function () {
    var elements = [];
    this.__evaluateStack();
    
    for (var i = 0; i < this.segments.length; i += 1) { 
        var skipCmd = (i > 0) && (this.segments[i][0] === this.segments[i - 1][0]);
        elements = elements.concat(skipCmd ? this.segments[i].slice(1) : this.segments[i]);
    }
    
    return elements.join(" ")
        .replace(/ ?([achlmqrstvz]) ?/gi, "$1")
        .replace(/ \-/g, "-")
        .replace(/zm/g, "z m");
};

SvgPath.prototype.translate = function (x, y) {
    this.__stack.push(new Matrix().translate(x, (y) || (0)));
    return this;
};

SvgPath.prototype.scale = function (sx, sy) {
    this.__stack.push(new Matrix().scale(sx, (!sy && sy !== 0) ? sx : sy));
    return this;
};

SvgPath.prototype.rotate = function (angle, rx, ry) {
    this.__stack.push(new Matrix().rotate(angle, (rx) || (0), (ry) || (0)));
    return this;
};

SvgPath.prototype.matrix = function (m) {
    this.__stack.push(new Matrix().matrix(m));
    return this;
};

SvgPath.prototype.transform = function (transformString) {
    if (!transformString.trim()) { 
        return this;
    }
    
    this.__stack.push(transformParse(transformString));
    return this;
};

SvgPath.prototype.round = function (d) {
    var contourStartDeltaX = 0;
    var contourStartDeltaY = 0;
    var deltaX = 0;
    var deltaY = 0;
    d = (d) || (0);
    
    this.__evaluateStack();
    
    this.segments.forEach(function (s) {
        var isRelative = s[0].toLowerCase() === s[0];
        
        switch (s[0]) { 
            case "H":
            case "h":
                if (isRelative) { 
                    s[1] += deltaX;
                }
                deltaX = s[1] - s[1].toFixed(d);
                s[1] = s[1].toFixed(d);
                return;
                
            case "V":
            case "v":
                if (isRelative) { 
                    s[1] += deltaY;
                }
                deltaY = s[1] - s[1].toFixed(d);
                s[1] = s[1].toFixed(d);
                return;
                
            case "Z":
            case "z":
                contourStartDeltaX = deltaX;
                contourStartDeltaY = deltaY;
                return;
                
            case "M":
            case "m":
                if (isRelative) { 
                    s[1] += deltaX;
                    s[2] += deltaY;
                }
                deltaX = s[1] - s[1].toFixed(d);
                deltaY = s[2] - s[2].toFixed(d);
                contourStartDeltaX = deltaX;
                contourStartDeltaY = deltaY;
                s[1] = s[1].toFixed(d);
                s[2] = s[2].toFixed(d);
                return;
                
            case "A":
            case "a":
                if (isRelative) { 
                    s[6] += deltaX;
                    s[7] += deltaY;
                }
                deltaX = s[6] - s[6].toFixed(d);
                deltaY = s[7] - s[7].toFixed(d);
                s[1] = s[1].toFixed(d);
                s[2] = s[2].toFixed(d);
                s[3] = s[3].toFixed(d + 2);
                s[6] = s[6].toFixed(d);
                s[7] = s[7].toFixed(d);
                return;
                
            default:
                var l = s.length;
                
                if (isRelative) { 
                    s[l - 2] += deltaX;
                    s[l - 1] += deltaY;
                }
                
                deltaX = s[l - 2] - s[l - 2].toFixed(d);
                deltaY = s[l - 1] - s[l - 1].toFixed(d);
                
                s.forEach(function (val, i) {
                    if (!i) { 
                        return;
                    }
                    s[i] = s[i].toFixed(d);
                });
                
                return;
        }
    });
    
    return this;
};

SvgPath.prototype.iterate = function (iterator, keepLazyStack) {
    var segments = this.segments;
    var replacements = {};
    var needReplace = false;
    var lastX = 0;
    var lastY = 0;
    var countourStartX = 0;
    var countourStartY = 0;
    
    if (!keepLazyStack) { 
        this.__evaluateStack();
    }
    
    segments.forEach(function (s, index) {
        var res = iterator(s, index, lastX, lastY);
        
        if (Array.isArray(res)) { 
            replacements[index] = res;
            needReplace = true;
        }
        
        var isRelative = s[0] === s[0].toLowerCase();
        
        switch (s[0]) { 
            case "m":
            case "M":
                lastX = s[1] + (isRelative ? lastX : 0);
                lastY = s[2] + (isRelative ? lastY : 0);
                countourStartX = lastX;
                countourStartY = lastY;
                return;
                
            case "h":
            case "H":
                lastX = s[1] + (isRelative ? lastX : 0);
                return;
                
            case "v":
            case "V":
                lastY = s[1] + (isRelative ? lastY : 0);
                return;
                
            case "z":
            case "Z":
                lastX = countourStartX;
                lastY = countourStartY;
                return;
                
            default:
                lastX = s[s.length - 2] + (isRelative ? lastX : 0);
                lastY = s[s.length - 1] + (isRelative ? lastY : 0);
        }
    });
    
    if (!needReplace) { 
        return this;
    }
    
    var newSegments = [];
    
    for (var i = 0; i < segments.length; i += 1) { 
        if (typeof replacements[i] !== "undefined") { 
            for (var j = 0; j < replacements[i].length; j += 1) { 
                newSegments.push(replacements[i][j]);
            }
        } else {
            newSegments.push(segments[i]);
        }
    }
    
    this.segments = newSegments;
    return this;
};

SvgPath.prototype.abs = function () {
    this.iterate(function (s, index, x, y) {
        var name = s[0];
        var nameUC = name.toUpperCase();
        
        if (name === nameUC) { 
            return;
        }
        
        s[0] = nameUC;
        
        switch (name) { 
            case "v":
                s[1] += y;
                return;
                
            case "a":
                s[6] += x;
                s[7] += y;
                return;
                
            default:
                for (var i = 1; i < s.length; i += 1) { 
                    s[i] += i % 2 ? x : y;
                }
        }
    }, true);
    
    return this;
};

SvgPath.prototype.rel = function () {
    this.iterate(function (s, index, x, y) {
        var name = s[0];
        var nameLC = name.toLowerCase();
        
        if (name === nameLC) { 
            return;
        }
        
        s[0] = nameLC;
        
        switch (name) { 
            case "V":
                s[1] -= y;
                return;
                
            case "A":
                s[6] -= x;
                s[7] -= y;
                return;
                
            default:
                for (var i = 1; i < s.length; i += 1) { 
                    s[i] -= i % 2 ? x : y;
                }
        }
    }, true);
    
    return this;
};

SvgPath.prototype.unarc = function () {
    this.iterate(function (s, index, x, y) {
        var result = [];
        var name = s[0];
        
        if ((name !== "A") && (name !== "a")) { 
            return null;
        }
        
        var nextX, nextY;
        
        if (name === "a") { 
            nextX = x + s[6];
            nextY = y + s[7];
        } else {
            nextX = s[6];
            nextY = s[7];
        }
        
        var new_segments = a2c(x, y, nextX, nextY, s[4], s[5], s[1], s[2], s[3]);
        
        new_segments.forEach(function (s) {
            result.push(["C", s[2], s[3], s[4], s[5], s[6], s[7]]);
        });
        
        return result;
    });
    
    return this;
};

SvgPath.prototype.unshort = function () {
    var segments = this.segments;
    
    this.iterate(function (s, idx, x, y) {
        var name = s[0];
        var nameUC = name.toUpperCase();
        
        if (!idx) { 
            return;
        }
        
        if (nameUC === "T") { 
            var isRelative = name === "t";
            var prevSegment = segments[idx - 1];
            var prevControlX, prevControlY;
            
            if (prevSegment[0] === "Q") { 
                prevControlX = prevSegment[1] - x;
                prevControlY = prevSegment[2] - y;
            } else if (prevSegment[0] === "q") {
                prevControlX = prevSegment[1] - prevSegment[3];
                prevControlY = prevSegment[2] - prevSegment[4];
            } else {
                prevControlX = 0;
                prevControlY = 0;
            }
            
            var curControlX = -prevControlX;
            var curControlY = -prevControlY;
            
            if (!isRelative) { 
                curControlX += x;
                curControlY += y;
            }
            
            segments[idx] = [isRelative ? "q" : "Q", curControlX, curControlY, s[1], s[2]];
        } else if (nameUC === "S") { 
            var isRelative = name === "s";
            var prevSegment = segments[idx - 1];
            var prevControlX, prevControlY;
            
            if (prevSegment[0] === "C") { 
                prevControlX = prevSegment[3] - x;
                prevControlY = prevSegment[4] - y;
            } else if (prevSegment[0] === "c") {
                prevControlX = prevSegment[3] - prevSegment[5];
                prevControlY = prevSegment[4] - prevSegment[6];
            } else {
                prevControlX = 0;
                prevControlY = 0;
            }
            
            var curControlX = -prevControlX;
            var curControlY = -prevControlY;
            
            if (!isRelative) { 
                curControlX += x;
                curControlY += y;
            }
            
            segments[idx] = [isRelative ? "c" : "C", curControlX, curControlY, s[1], s[2], s[3], s[4]];
        }
    });
    
    return this;
};

// Constants
var paramCounts = {a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, r: 4, s: 4, t: 2, v: 1, z: 0};
var SPECIAL_SPACES = [5760, 6158, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8239, 8287, 12288, 65279];
var TAU = Math.PI * 2;
var operations = {matrix: true, rotate: true, scale: true, skewX: true, skewY: true, translate: true};
var CMD_SPLIT_RE = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(.+?)\s*\)[\s,]*/;
var PARAMS_SPLIT_RE = /[\s,]+/;

// Matrix methods
Matrix.prototype.matrix = function (m) {
    if ((((((m[0] === 1) && (m[1] === 0)) && (m[2] === 0)) && (m[3] === 1)) && (m[4] === 0)) && (m[5] === 0)) { 
        return this;
    }
    
    this.cache = null;
    this.queue.push(m);
    return this;
};

Matrix.prototype.translate = function (tx, ty) {
    if ((tx !== 0) || (ty !== 0)) { 
        this.cache = null;
        this.queue.push([1, 0, 0, 1, tx, ty]);
    }
    
    return this;
};

Matrix.prototype.scale = function (sx, sy) {
    if ((sx !== 1) || (sy !== 1)) { 
        this.cache = null;
        this.queue.push([sx, 0, 0, sy, 0, 0]);
    }
    
    return this;
};

Matrix.prototype.rotate = function (angle, rx, ry) {
    if (angle !== 0) { 
        this.translate(rx, ry);
        var rad = (angle * Math.PI) / 180;
        var cos = Math.cos(rad);
        var sin = Math.sin(rad);
        this.queue.push([cos, sin, -sin, cos, 0, 0]);
        this.cache = null;
        this.translate(-rx, -ry);
    }
    
    return this;
};

Matrix.prototype.skewX = function (angle) {
    if (angle !== 0) { 
        this.cache = null;
        this.queue.push([1, 0, Math.tan((angle * Math.PI) / 180), 1, 0, 0]);
    }
    
    return this;
};

Matrix.prototype.skewY = function (angle) {
    if (angle !== 0) { 
        this.cache = null;
        this.queue.push([1, Math.tan((angle * Math.PI) / 180), 0, 1, 0, 0]);
    }
    
    return this;
};

Matrix.prototype.toArray = function () {
    if (this.cache) { 
        return this.cache;
    }
    
    if (!this.queue.length) { 
        this.cache = [1, 0, 0, 1, 0, 0];
        return this.cache;
    }
    
    this.cache = this.queue[0];
    
    if (this.queue.length === 1) { 
        return this.cache;
    }
    
    for (var i = 1; i < this.queue.length; i += 1) { 
        this.cache = combine(this.cache, this.queue[i]);
    }
    
    return this.cache;
};

Matrix.prototype.calc = function (x, y, isRelative) {
    if (!this.queue.length) { 
        return [x, y];
    }
    
    if (!this.cache) { 
        this.cache = this.toArray();
    }
    
    var m = this.cache;
    return [
        (x * m[0]) + (y * m[2]) + (isRelative ? 0 : m[4]), 
        (x * m[1]) + (y * m[3]) + (isRelative ? 0 : m[5])
    ];
};

var createSubPathsFromSVGpath = function (data, transformString) {
    var cleanValue = function (value) {
        if (value.charAt(0).match(/[a-z]/i)) { 
            value = value.substr(1);
        }
        return parseFloat(value);
    };
    
    if (transformString != null) { 
        data = SvgPath(data).transform(transformString).unarc().unshort().abs().toString();
    } else {
        data = SvgPath(data).unarc().unshort().abs().toString();
    }
    
    data = data.replace(/NaN/g, " ");
    var pathPoints = [];
    data = data.replace(/,/gi, " ");
    data = data.replace(/(\d)(?=[MmCcLlHhVvAaQqTtSsZz-])/g, "$1 ");
    data = data.replace(/([MmCcLlHhVvAaQqTtSsZz])+\s/g, "$1");
    data = data.replace(/(z|Z)(?=[MmCcLlHhVvAaQqTtSs])/g, "$1 ");
    data = data.replace(/\s+/g, " ");
    data = data.split(" ");
    
    var arrayOfSubPathArrays = [];
    var shapeIndex = -1;
    var previousPoint = [];
    var len = data.length;
    var pointIndex = 0;
    var shapeStartIndex = 0;
    var command = '';
    
    for (var i = 0; i < len; i += 1) { 
        if (data[i].charAt(0).match(/[a-z]/i)) { 
            command = data[i].charAt(0);
        }
        
        switch (command) { 
            case "C":
                pathPoints[pointIndex] = new PathPointInfo();
                pathPoints[pointIndex].kind = PointKind.SMOOTHPOINT;
                pathPoints[pointIndex].anchor = [cleanValue(data[i + 4]), cleanValue(data[i + 5])];
                
                try {
                    var nextPointType = data[i + 6].charAt(0);
                } catch (e) {
                    var nextPointType = "";
                }
                
                if ((((i + 6) < (len - 1)) && (nextPointType != "M")) && (nextPointType != "Z")) { 
                    if (nextPointType == "V") { 
                        pathPoints[pointIndex].leftDirection = [pathPoints[pointIndex].anchor[0], cleanValue(data[i + 6])];
                    } else if (nextPointType == "H") {
                        pathPoints[pointIndex].leftDirection = [cleanValue(data[i + 6]), pathPoints[pointIndex].anchor[1]];
                    } else {
                        pathPoints[pointIndex].leftDirection = [cleanValue(data[i + 6]), cleanValue(data[i + 7])];
                    }
                } else {
                    var nextPointType = data[shapeStartIndex + 2].charAt(0);
                    
                    if (nextPointType == "V") { 
                        pathPoints[pointIndex].leftDirection = [cleanValue(data[shapeStartIndex]), cleanValue(data[shapeStartIndex + 2])];
                    } else if (nextPointType == "H") {
                        pathPoints[pointIndex].leftDirection = [cleanValue(data[shapeStartIndex + 2]), cleanValue(data[shapeStartIndex + 1])];
                    } else {
                        pathPoints[pointIndex].leftDirection = [cleanValue(data[shapeStartIndex]), cleanValue(data[shapeStartIndex + 1])];
                    }
                }
                
                pathPoints[pointIndex].rightDirection = [cleanValue(data[i + 2]), cleanValue(data[i + 3])];
                i = i + 5;
                previousPoint = pathPoints[pointIndex].anchor;
                pointIndex++;
                break;
                
            case "L":
                pathPoints[pointIndex] = new PathPointInfo();
                pathPoints[pointIndex].anchor = [cleanValue(data[i]), cleanValue(data[i + 1])];
                
                try {
                    var nextPointType = data[i + 2].charAt(0);
                } catch (e) {
                    var nextPointType = "";
                }
                
                if (nextPointType == "C") { 
                    pathPoints[pointIndex].kind = PointKind.SMOOTHPOINT;
                    pathPoints[pointIndex].leftDirection = [cleanValue(data[i + 2]), cleanValue(data[i + 3])];
                } else {
                    pathPoints[pointIndex].kind = PointKind.CORNERPOINT;
                    pathPoints[pointIndex].leftDirection = pathPoints[pointIndex].anchor;
                }
                
                pathPoints[pointIndex].rightDirection = pathPoints[pointIndex].anchor;
                i = i + 1;
                previousPoint = pathPoints[pointIndex].anchor;
                pointIndex++;
                break;
                
            case "H":
                pathPoints[pointIndex] = new PathPointInfo();
                pathPoints[pointIndex].anchor = [cleanValue(data[i]), previousPoint[1]];
                
                try {
                    var nextPointType = data[i + 1].charAt(0);
                } catch (e) {
                    var nextPointType = "";
                }
                
                if (nextPointType == "C") { 
                    pathPoints[pointIndex].kind = PointKind.SMOOTHPOINT;
                    pathPoints[pointIndex].leftDirection = [cleanValue(data[i + 1]), cleanValue(data[i + 2])];
                } else {
                    pathPoints[pointIndex].kind = PointKind.CORNERPOINT;
                    pathPoints[pointIndex].leftDirection = pathPoints[pointIndex].anchor;
                }
                
                pathPoints[pointIndex].rightDirection = pathPoints[pointIndex].anchor;
                previousPoint = pathPoints[pointIndex].anchor;
                pointIndex++;
                break;
                
            case "V":
                pathPoints[pointIndex] = new PathPointInfo();
                pathPoints[pointIndex].anchor = [previousPoint[0], cleanValue(data[i])];
                
                try {
                    var nextPointType = data[i + 1].charAt(0);
                } catch (e) {
                    var nextPointType = "";
                }
                
                if (nextPointType == "C") { 
                    pathPoints[pointIndex].kind = PointKind.SMOOTHPOINT;
                    pathPoints[pointIndex].leftDirection = [cleanValue(data[i + 1]), cleanValue(data[i + 2])];
                } else {
                    pathPoints[pointIndex].kind = PointKind.CORNERPOINT;
                    pathPoints[pointIndex].leftDirection = pathPoints[pointIndex].anchor;
                }
                
                pathPoints[pointIndex].rightDirection = pathPoints[pointIndex].anchor;
                previousPoint = pathPoints[pointIndex].anchor;
                pointIndex++;
                break;
                
            case "M":
                if (shapeIndex != -1) { 
                    arrayOfSubPathArrays[shapeIndex].operation = ShapeOperation.SHAPEXOR;
                    arrayOfSubPathArrays[shapeIndex].entireSubPath = pathPoints;
                    pathPoints = [];
                    pointIndex = 0;
                }
                
                pathPoints[pointIndex] = new PathPointInfo();
                pathPoints[pointIndex].anchor = [cleanValue(data[i]), cleanValue(data[i + 1])];
                
                try {
                    var nextPointType = data[i + 2].charAt(0);
                } catch (e) {
                    var nextPointType = "";
                }
                
                if (nextPointType == "C") { 
                    pathPoints[pointIndex].kind = PointKind.SMOOTHPOINT;
                    pathPoints[pointIndex].leftDirection = [cleanValue(data[i + 2]), cleanValue(data[i + 3])];
                } else {
                    pathPoints[pointIndex].kind = PointKind.CORNERPOINT;
                    pathPoints[pointIndex].leftDirection = pathPoints[pointIndex].anchor;
                }
                
                pathPoints[pointIndex].rightDirection = pathPoints[pointIndex].anchor;
                pointIndex++;
                shapeIndex++;
                shapeStartIndex = i;
                arrayOfSubPathArrays[shapeIndex] = new SubPathInfo();
                arrayOfSubPathArrays[shapeIndex].closed = false;
                arrayOfSubPathArrays[shapeIndex].operation = ShapeOperation.SHAPEADD;
                previousPoint = [cleanValue(data[i]), cleanValue(data[i + 1])];
                i = i + 1;
                command = "L";
                break;
                
            case "Z":
                if ((pathPoints[0].anchor[0] == previousPoint[0]) && (pathPoints[0].anchor[1] == previousPoint[1])) { 
                    pathPoints[pointIndex - 1].leftDirection = pathPoints[0].leftDirection;
                    pathPoints[pointIndex - 1].kind = pathPoints[0].kind;
                    pathPoints.shift();
                }
                
                if (shapeIndex > 0) { 
                    arrayOfSubPathArrays[shapeIndex].operation = ShapeOperation.SHAPEXOR;
                }
                
                arrayOfSubPathArrays[shapeIndex].closed = true;
                arrayOfSubPathArrays[shapeIndex].entireSubPath = pathPoints;
                previousPoint = [];
                break;
        }
        
        arrayOfSubPathArrays[shapeIndex].entireSubPath = pathPoints;
        
        if (shapeIndex > 0) { 
            arrayOfSubPathArrays[shapeIndex].operation = ShapeOperation.SHAPEXOR;
        }
    }
    
    return arrayOfSubPathArrays;
};

var createShapeLayer = function (doc, subPaths, fill, stroke, opacity, parent, name) {
    var myPathItem = doc.pathItems.add("tempPath", subPaths);
    var desc88 = new ActionDescriptor();
    var ref60 = new ActionReference();
    ref60.putClass(stringIDToTypeID("contentLayer"));
    desc88.putReference(charIDToTypeID("null"), ref60);
    var desc89 = new ActionDescriptor();
    var desc90 = new ActionDescriptor();
    var desc91 = new ActionDescriptor();
    desc91.putDouble(charIDToTypeID("Rd  "), fill.color.rgb.red);
    desc91.putDouble(charIDToTypeID("Grn "), fill.color.rgb.green);
    desc91.putDouble(charIDToTypeID("Bl  "), fill.color.rgb.blue);
    var id481 = charIDToTypeID("RGBC");
    desc90.putObject(charIDToTypeID("Clr "), id481, desc91);
    desc89.putObject(charIDToTypeID("Type"), stringIDToTypeID("solidColorLayer"), desc90);
    desc88.putObject(charIDToTypeID("Usng"), stringIDToTypeID("contentLayer"), desc89);
    executeAction(charIDToTypeID("Mk  "), desc88, DialogModes.NO);
    myPathItem.remove();
    
    if (fill.type == "none") { 
        if (PSversion >= 13) { 
            setFillColor(fill);
        } else {
            fill.opacity = 0;
        }
    } else {
        if (fill.type == "gradient") { 
            setFillColor(fill);
        }
    }
    
    if (fill.opacity != 100) { 
        doc.activeLayer.fillOpacity = fill.opacity;
    }
    
    if (opacity != 100) { 
        doc.activeLayer.opacity = opacity;
    }
    
    switch (stroke.type) { 
        case "solid":
            if ((stroke.opacity == 100) && (PSversion >= 13)) { 
                applyShapeStroke(stroke);
            } else {
                applyStrokeStyle(stroke);
            }
            break;
    }
    
    doc.activeLayer.move(parent, ElementPlacement.INSIDE);
    
    if (name != null) { 
        doc.activeLayer.name = name;
    }
};

var setFillColor = function (fill) {
    switch (fill.type) { 
        case "solid":
            var idsetd = charIDToTypeID("setd");
            var desc8 = new ActionDescriptor();
            var idnull = charIDToTypeID("null");
            var ref3 = new ActionReference();
            var idcontentLayer = stringIDToTypeID("contentLayer");
            var idOrdn = charIDToTypeID("Ordn");
            var idTrgt = charIDToTypeID("Trgt");
            ref3.putEnumerated(idcontentLayer, idOrdn, idTrgt);
            desc8.putReference(idnull, ref3);
            var idT = charIDToTypeID("T   ");
            var desc9 = new ActionDescriptor();
            var idClr = charIDToTypeID("Clr ");
            var desc10 = new ActionDescriptor();
            var idRd = charIDToTypeID("Rd  ");
            desc10.putDouble(idRd, fill.color.rgb.red);
            var idGrn = charIDToTypeID("Grn ");
            desc10.putDouble(idGrn, fill.color.rgb.green);
            var idBl = charIDToTypeID("Bl  ");
            desc10.putDouble(idBl, fill.color.rgb.blue);
            var idRGBC = charIDToTypeID("RGBC");
            desc9.putObject(idClr, idRGBC, desc10);
            var idsolidColorLayer = stringIDToTypeID("solidColorLayer");
            desc8.putObject(idT, idsolidColorLayer, desc9);
            executeAction(idsetd, desc8, DialogModes.NO);
            break;
            
        case "gradient":
            var gradient = getById(gradients, fill.gradientId);
            applyGradient(gradient);
            break;
            
        case "none":
            if (PSversion >= 13) { 
                var idsetd = charIDToTypeID("setd");
                var desc13 = new ActionDescriptor();
                var idnull = charIDToTypeID("null");
                var ref2 = new ActionReference();
                var idcontentLayer = stringIDToTypeID("contentLayer");
                var idOrdn = charIDToTypeID("Ordn");
                var idTrgt = charIDToTypeID("Trgt");
                ref2.putEnumerated(idcontentLayer, idOrdn, idTrgt);
                desc13.putReference(idnull, ref2);
                var idT = charIDToTypeID("T   ");
                var desc14 = new ActionDescriptor();
                var idstrokeStyle = stringIDToTypeID("strokeStyle");
                var desc15 = new ActionDescriptor();
                var idstrokeStyleVersion = stringIDToTypeID("strokeStyleVersion");
                desc15.putInteger(idstrokeStyleVersion, 2);
                var idfillEnabled = stringIDToTypeID("fillEnabled");
                desc15.putBoolean(idfillEnabled, false);
                var idstrokeStyle = stringIDToTypeID("strokeStyle");
                desc14.putObject(idstrokeStyle, idstrokeStyle, desc15);
                var idshapeStyle = stringIDToTypeID("shapeStyle");
                desc13.putObject(idT, idshapeStyle, desc14);
                executeAction(idsetd, desc13, DialogModes.NO);
            } else {
                fill.opacity = 0;
            }
            break;
    }
};

var createRoundRect = function (doc, bounds, radius, fill, stroke, opacity, parent, name) {
    var idMk = charIDToTypeID("Mk  ");
    var desc7 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref3 = new ActionReference();
    var idcontentLayer = stringIDToTypeID("contentLayer");
    ref3.putClass(idcontentLayer);
    desc7.putReference(idnull, ref3);
    var idUsng = charIDToTypeID("Usng");
    var desc8 = new ActionDescriptor();
    var idType = charIDToTypeID("Type");
    var idsolidColorLayer = stringIDToTypeID("solidColorLayer");
    desc8.putClass(idType, idsolidColorLayer);
    var idShp = charIDToTypeID("Shp ");
    var desc9 = new ActionDescriptor();
    var idTop = charIDToTypeID("Top ");
    var idPxl = charIDToTypeID("#Pxl");
    desc9.putUnitDouble(idTop, idPxl, bounds[1]);
    var idLeft = charIDToTypeID("Left");
    var idPxl = charIDToTypeID("#Pxl");
    desc9.putUnitDouble(idLeft, idPxl, bounds[0]);
    var idBtom = charIDToTypeID("Btom");
    var idPxl = charIDToTypeID("#Pxl");
    desc9.putUnitDouble(idBtom, idPxl, bounds[3]);
    var idRght = charIDToTypeID("Rght");
    var idPxl = charIDToTypeID("#Pxl");
    desc9.putUnitDouble(idRght, idPxl, bounds[2]);
    var idRds = charIDToTypeID("Rds ");
    var idPxl = charIDToTypeID("#Pxl");
    desc9.putUnitDouble(idRds, idPxl, radius);
    var idRctn = charIDToTypeID("Rctn");
    desc8.putObject(idShp, idRctn, desc9);
    var idcontentLayer = stringIDToTypeID("contentLayer");
    desc7.putObject(idUsng, idcontentLayer, desc8);
    executeAction(idMk, desc7, DialogModes.NO);
    setFillColor(fill);
    
    if (fill.opacity != 100) { 
        doc.activeLayer.fillOpacity = fill.opacity;
    }
    
    if (opacity != 100) { 
        doc.activeLayer.opacity = opacity;
    }
    
    switch (stroke.type) { 
        case "solid":
            if ((stroke.opacity == 100) && (PSversion >= 13)) { 
                applyShapeStroke(stroke);
            } else {
                applyStrokeStyle(stroke);
            }
            break;
    }
    
    doc.activeLayer.move(parent, ElementPlacement.INSIDE);
    
    if (name != null) { 
        doc.activeLayer.name = name;
    }
    
    return doc.activeLayer;
};

var createEllipse = function (doc, bounds, fill, stroke, opacity, parent, name) {
    var idMk = charIDToTypeID("Mk  ");
    var desc4 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref2 = new ActionReference();
    var idcontentLayer = stringIDToTypeID("contentLayer");
    ref2.putClass(idcontentLayer);
    desc4.putReference(idnull, ref2);
    var idUsng = charIDToTypeID("Usng");
    var desc5 = new ActionDescriptor();
    var idType = charIDToTypeID("Type");
    var idsolidColorLayer = stringIDToTypeID("solidColorLayer");
    desc5.putClass(idType, idsolidColorLayer);
    var idShp = charIDToTypeID("Shp ");
    var desc6 = new ActionDescriptor();
    var idTop = charIDToTypeID("Top ");
    var idPxl = charIDToTypeID("#Pxl");
    desc6.putUnitDouble(idTop, idPxl, bounds[1]);
    var idLeft = charIDToTypeID("Left");
    var idPxl = charIDToTypeID("#Pxl");
    desc6.putUnitDouble(idLeft, idPxl, bounds[0]);
    var idBtom = charIDToTypeID("Btom");
    var idPxl = charIDToTypeID("#Pxl");
    desc6.putUnitDouble(idBtom, idPxl, bounds[3]);
    var idRght = charIDToTypeID("Rght");
    var idPxl = charIDToTypeID("#Pxl");
    desc6.putUnitDouble(idRght, idPxl, bounds[2]);
    var idElps = charIDToTypeID("Elps");
    desc5.putObject(idShp, idElps, desc6);
    var idcontentLayer = stringIDToTypeID("contentLayer");
    desc4.putObject(idUsng, idcontentLayer, desc5);
    executeAction(idMk, desc4, DialogModes.NO);
    setFillColor(fill);
    
    if (fill.opacity != 100) { 
        doc.activeLayer.fillOpacity = fill.opacity;
    }
    
    if (opacity != 100) { 
        doc.activeLayer.opacity = opacity;
    }
    
    switch (stroke.type) { 
        case "solid":
            if ((stroke.opacity == 100) && (PSversion >= 13)) { 
                applyShapeStroke(stroke);
            } else {
                applyStrokeStyle(stroke);
            }
            break;
    }
    
    doc.activeLayer.move(parent, ElementPlacement.INSIDE);
    
    if (name != null) { 
        doc.activeLayer.name = name;
    }
    
    return doc.activeLayer;
};

var createLine = function (doc, fromCoord, toCoord, stroke, opacity, parent, name) {
    var idMk = charIDToTypeID("Mk  ");
    var desc3 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref1 = new ActionReference();
    var idcontentLayer = stringIDToTypeID("contentLayer");
    ref1.putClass(idcontentLayer);
    desc3.putReference(idnull, ref1);
    var idUsng = charIDToTypeID("Usng");
    var desc4 = new ActionDescriptor();
    var idType = charIDToTypeID("Type");
    var idsolidColorLayer = stringIDToTypeID("solidColorLayer");
    desc4.putClass(idType, idsolidColorLayer);
    var idShp = charIDToTypeID("Shp ");
    var desc5 = new ActionDescriptor();
    var idStrt = charIDToTypeID("Strt");
    var desc6 = new ActionDescriptor();
    var idHrzn = charIDToTypeID("Hrzn");
    var idPxl = charIDToTypeID("#Pxl");
    desc6.putUnitDouble(idHrzn, idPxl, fromCoord[0]);
    var idVrtc = charIDToTypeID("Vrtc");
    var idPxl = charIDToTypeID("#Pxl");
    desc6.putUnitDouble(idVrtc, idPxl, fromCoord[1]);
    var idPnt = charIDToTypeID("Pnt ");
    desc5.putObject(idStrt, idPnt, desc6);
    var idEnd = charIDToTypeID("End ");
    var desc7 = new ActionDescriptor();
    var idHrzn = charIDToTypeID("Hrzn");
    var idPxl = charIDToTypeID("#Pxl");
    desc7.putUnitDouble(idHrzn, idPxl, toCoord[0]);
    var idVrtc = charIDToTypeID("Vrtc");
    var idPxl = charIDToTypeID("#Pxl");
    desc7.putUnitDouble(idVrtc, idPxl, toCoord[1]);
    var idPnt = charIDToTypeID("Pnt ");
    desc5.putObject(idEnd, idPnt, desc7);
    var idWdth = charIDToTypeID("Wdth");
    var idPxl = charIDToTypeID("#Pxl");
    desc5.putUnitDouble(idWdth, idPxl, stroke.width);
    var idLn = charIDToTypeID("Ln  ");
    desc4.putObject(idShp, idLn, desc5);
    var idcontentLayer = stringIDToTypeID("contentLayer");
    desc3.putObject(idUsng, idcontentLayer, desc4);
    executeAction(idMk, desc3, DialogModes.NO);
    setFillColor(stroke);
    
    if (opacity != 100) { 
        doc.activeLayer.opacity = opacity;
    }
    
    doc.activeLayer.move(parent, ElementPlacement.INSIDE);
    
    if (name != null) { 
        doc.activeLayer.name = name;
    }
    
    return doc.activeLayer;
};

var createTextLayer = function (doc, position, font, fontSize, fontStyle, fontWeight, textAnchor, fill, stroke, opacity, textContent, parent, name) {
    var layer = doc.artLayers.add();
    layer.kind = LayerKind.TEXT;
    var text = layer.textItem;
    
    var findFont = function (f, variations) {
        if (variations == undefined) { 
            variations = [""];
        } else {
            variations.push("");
        }
        
        var numOfVariations = variations.length;
        var flist = app.fonts;
        
        for (var i = flist.length - 1; i >= 0; i--) { 
            for (var n = 0; n < numOfVariations; n += 1) { 
                if ((f + variations[n]) == flist[i].name) { 
                    return flist[i];
                }
            }
        }
        
        return "unknown";
    };
    
    text.kind = TextType.POINTTEXT;
    text.position = position;
    fontStyle = fontStyle.toLowerCase();
    
    if ((fontStyle == "cursive") || (fontStyle == "kursiv")) { 
        fontStyle = "italic";
    }
    
    var psFontName;
    
    switch (fontWeight.toLowerCase()) { 
        case "100":
            if ((fontStyle == "oblique") || (fontStyle == "italic")) { 
                psFontName = findFont(font, [" Thin Oblique", " Thin Italic"]);
            } else {
                psFontName = findFont(font, [" Thin"]);
            }
            break;
            
        case "200":
            if ((fontStyle == "oblique") || (fontStyle == "italic")) { 
                psFontName = findFont(font, [" Extra Light Oblique", " Extra Light Italic", " Ultra Light Oblique", " Ultra Light Italic"]);
            } else {
                psFontName = findFont(font, [" Extra Light", " Ultra Light"]);
            }
            break;
            
        case "300":
            if ((fontStyle == "oblique") || (fontStyle == "italic")) { 
                psFontName = findFont(font, [" Light Oblique", " Light Italic"]);
            } else {
                psFontName = findFont(font, [" Light"]);
            }
            break;
            
        case "500":
            if ((fontStyle == "oblique") || (fontStyle == "italic")) { 
                psFontName = findFont(font, [" Medium Oblique", " Medium Italic"]);
            } else {
                psFontName = findFont(font, [" Medium"]);
            }
            break;
            
        case "600":
            if ((fontStyle == "oblique") || (fontStyle == "italic")) { 
                psFontName = findFont(font, [" Semi Bold Oblique", " Semi Bold Italic", " Semibold Oblique", " Semibold Italic", " Demi Bold Oblique", " Demi Bold Italic"]);
            } else {
                psFontName = findFont(font, [" Semi Bold", " Semibold", " Demi Bold"]);
            }
            break;
            
        case "bold":
        case "700":
            if ((fontStyle == "oblique") || (fontStyle == "italic")) { 
                psFontName = findFont(font, [" Bold Oblique", " Bold Italic"]);
            } else {
                psFontName = findFont(font, [" Bold"]);
            }
            break;
            
        case "800":
            if ((fontStyle == "oblique") || (fontStyle == "italic")) { 
                psFontName = findFont(font, [" Extra Bold Oblique", " Extra Bold Italic", " Ultra Bold Oblique", " Ultra Bold Italic", " Heavy Oblique", " Heavy Italic"]);
            } else {
                psFontName = findFont(font, [" Extra Bold", " Ultra Bold", " Heavy"]);
            }
            break;
            
        case "900":
            if ((fontStyle == "oblique") || (fontStyle == "italic")) { 
                psFontName = findFont(font, [" Heavy Oblique", " Heavy Italic", " Black Oblique", " Black Italic"]);
            } else {
                psFontName = findFont(font, [" Heavy", " Black"]);
            }
            break;
            
        default:
            if ((fontStyle == "oblique") || (fontStyle == "italic")) { 
                psFontName = findFont(font, [" Oblique", " Italic"]);
            } else {
                psFontName = findFont(font);
            }
            break;
    }
    
    if (psFontName != "unknown") { 
        psFontName = psFontName.postScriptName;
    }
    
    text.font = psFontName;
    var undoUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    text.size = fontSize;
    text.color = fill.color;
    text.antiAliasMethod = AntiAlias.CRISP;
    
    switch (textAnchor.toLowerCase()) { 
        case "start":
            text.justification = Justification.LEFT;
            break;
            
        case "middle":
            text.justification = Justification.CENTER;
            break;
            
        case "end":
            text.justification = Justification.RIGHT;
            break;
            
        default:
            text.justification = Justification.LEFT;
            break;
    }
    
    text.contents = textContent.toString();
    
    if (fill.opacity != 100) { 
        layer.fillOpacity = fill.opacity;
    }
    
    if (opacity != 100) { 
        layer.opacity = opacity;
    }
    
    switch (stroke.type) { 
        case "solid":
            applyStrokeStyle(stroke);
            break;
    }
    
    layer.move(parent, ElementPlacement.INSIDE);
    
    if (name != null) { 
        layer.name = name;
    }
    
    app.preferences.rulerUnits = undoUnits;
    return layer;
};

var createEmptyLayer = function (doc) {
    var idMk = charIDToTypeID("Mk  ");
    var desc79 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref37 = new ActionReference();
    var idLyr = charIDToTypeID("Lyr ");
    ref37.putClass(idLyr);
    desc79.putReference(idnull, ref37);
    var idLyrI = charIDToTypeID("LyrI");
    desc79.putInteger(idLyrI, 6);
    executeAction(idMk, desc79, DialogModes.NO);
    return doc.activeLayer;
};

var createGroup = function (doc, name, opacity) {
    var idMk = charIDToTypeID("Mk  ");
    var desc8 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref2 = new ActionReference();
    var idlayerSection = stringIDToTypeID("layerSection");
    ref2.putClass(idlayerSection);
    desc8.putReference(idnull, ref2);
    var idUsng = charIDToTypeID("Usng");
    var desc9 = new ActionDescriptor();
    var idNm = charIDToTypeID("Nm  ");
    desc9.putString(idNm, name);
    var idlayerSection = stringIDToTypeID("layerSection");
    desc8.putObject(idUsng, idlayerSection, desc9);
    executeAction(idMk, desc8, DialogModes.NO);
    
    if (opacity != 100) { 
        doc.activeLayer.opacity = opacity;
    }
    
    return doc.activeLayer;
};

var applyStrokeStyle = function (stroke) {
    var idsetd = charIDToTypeID("setd");
    var desc12 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref3 = new ActionReference();
    var idPrpr = charIDToTypeID("Prpr");
    var idLefx = charIDToTypeID("Lefx");
    ref3.putProperty(idPrpr, idLefx);
    var idLyr = charIDToTypeID("Lyr ");
    var idOrdn = charIDToTypeID("Ordn");
    var idTrgt = charIDToTypeID("Trgt");
    ref3.putEnumerated(idLyr, idOrdn, idTrgt);
    desc12.putReference(idnull, ref3);
    var idT = charIDToTypeID("T   ");
    var desc13 = new ActionDescriptor();
    var idScl = charIDToTypeID("Scl ");
    var idPrc = charIDToTypeID("#Prc");
    desc13.putUnitDouble(idScl, idPrc, 100);
    var idFrFX = charIDToTypeID("FrFX");
    var desc14 = new ActionDescriptor();
    var idenab = charIDToTypeID("enab");
    desc14.putBoolean(idenab, true);
    var idStyl = charIDToTypeID("Styl");
    var idFStl = charIDToTypeID("FStl");
    var idCtrF = charIDToTypeID("CtrF");
    desc14.putEnumerated(idStyl, idFStl, idCtrF);
    var idPntT = charIDToTypeID("PntT");
    var idFrFl = charIDToTypeID("FrFl");
    var idSClr = charIDToTypeID("SClr");
    desc14.putEnumerated(idPntT, idFrFl, idSClr);
    var idMd = charIDToTypeID("Md  ");
    var idBlnM = charIDToTypeID("BlnM");
    var idNrml = charIDToTypeID("Nrml");
    desc14.putEnumerated(idMd, idBlnM, idNrml);
    var idOpct = charIDToTypeID("Opct");
    var idPrc = charIDToTypeID("#Prc");
    desc14.putUnitDouble(idOpct, idPrc, stroke.opacity);
    var idSz = charIDToTypeID("Sz  ");
    var idPxl = charIDToTypeID("#Pxl");
    desc14.putUnitDouble(idSz, idPxl, stroke.width);
    var idClr = charIDToTypeID("Clr ");
    var desc15 = new ActionDescriptor();
    var idRd = charIDToTypeID("Rd  ");
    desc15.putDouble(idRd, stroke.color.rgb.red);
    var idGrn = charIDToTypeID("Grn ");
    desc15.putDouble(idGrn, stroke.color.rgb.green);
    var idBl = charIDToTypeID("Bl  ");
    desc15.putDouble(idBl, stroke.color.rgb.blue);
    var idRGBC = charIDToTypeID("RGBC");
    desc14.putObject(idClr, idRGBC, desc15);
    var idFrFX = charIDToTypeID("FrFX");
    desc13.putObject(idFrFX, idFrFX, desc14);
    var idLefx = charIDToTypeID("Lefx");
    desc12.putObject(idT, idLefx, desc13);
    executeAction(idsetd, desc12, DialogModes.NO);
};

var applyShapeStroke = function (stroke) {
    var strokeLineCap = "strokeStyleButtCap";
    
    switch (stroke.lineCap) { 
        case "round":
            strokeLineCap = "strokeStyleRoundCap";
            break;
            
        case "square":
            strokeLineCap = "strokeStyleSquareCap";
            break;
    }
    
    var strokeLineJoin = "strokeStyleMiterJoin";
    
    switch (stroke.lineJoin) { 
        case "round":
            strokeLineJoin = "strokeStyleRoundJoin";
            break;
            
        case "bevel":
            strokeLineJoin = "strokeStyleBevelJoin";
            break;
    }
    
    var idsetd = charIDToTypeID("setd");
    var desc105 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref30 = new ActionReference();
    var idcontentLayer = stringIDToTypeID("contentLayer");
    var idOrdn = charIDToTypeID("Ordn");
    var idTrgt = charIDToTypeID("Trgt");
    ref30.putEnumerated(idcontentLayer, idOrdn, idTrgt);
    desc105.putReference(idnull, ref30);
    var idT = charIDToTypeID("T   ");
    var desc106 = new ActionDescriptor();
    var idstrokeStyle = stringIDToTypeID("strokeStyle");
    var desc107 = new ActionDescriptor();
    var idstrokeStyleLineWidth = stringIDToTypeID("strokeStyleLineWidth");
    var idPxl = charIDToTypeID("#Pxl");
    desc107.putUnitDouble(idstrokeStyleLineWidth, idPxl, stroke.width);
    var idstrokeStyleLineCapType = stringIDToTypeID("strokeStyleLineCapType");
    var idstrokeStyleLineCapType = stringIDToTypeID("strokeStyleLineCapType");
    var idstrokeStyleButtCap = stringIDToTypeID(strokeLineCap);
    desc107.putEnumerated(idstrokeStyleLineCapType, idstrokeStyleLineCapType, idstrokeStyleButtCap);
    var idstrokeStyleLineJoinType = stringIDToTypeID("strokeStyleLineJoinType");
    var idstrokeStyleLineJoinType = stringIDToTypeID("strokeStyleLineJoinType");
    var idstrokeStyleMiterJoin = stringIDToTypeID(strokeLineJoin);
    desc107.putEnumerated(idstrokeStyleLineJoinType, idstrokeStyleLineJoinType, idstrokeStyleMiterJoin);
    var idstrokeStyleLineAlignment = stringIDToTypeID("strokeStyleLineAlignment");
    var idstrokeStyleLineAlignment = stringIDToTypeID("strokeStyleLineAlignment");
    var idstrokeStyleAlignCenter = stringIDToTypeID("strokeStyleAlignCenter");
    desc107.putEnumerated(idstrokeStyleLineAlignment, idstrokeStyleLineAlignment, idstrokeStyleAlignCenter);
    var idstrokeStyleContent = stringIDToTypeID("strokeStyleContent");
    var desc108 = new ActionDescriptor();
    var idClr = charIDToTypeID("Clr ");
    var desc109 = new ActionDescriptor();
    var idRd = charIDToTypeID("Rd  ");
    desc109.putDouble(idRd, stroke.color.rgb.red);
    var idGrn = charIDToTypeID("Grn ");
    desc109.putDouble(idGrn, stroke.color.rgb.green);
    var idBl = charIDToTypeID("Bl  ");
    desc109.putDouble(idBl, stroke.color.rgb.blue);
    var idRGBC = charIDToTypeID("RGBC");
    desc108.putObject(idClr, idRGBC, desc109);
    var idsolidColorLayer = stringIDToTypeID("solidColorLayer");
    desc107.putObject(idstrokeStyleContent, idsolidColorLayer, desc108);
    var idstrokeStyleVersion = stringIDToTypeID("strokeStyleVersion");
    desc107.putInteger(idstrokeStyleVersion, 2);
    var idstrokeEnabled = stringIDToTypeID("strokeEnabled");
    desc107.putBoolean(idstrokeEnabled, true);
    var idstrokeStyle = stringIDToTypeID("strokeStyle");
    desc106.putObject(idstrokeStyle, idstrokeStyle, desc107);
    var idshapeStyle = stringIDToTypeID("shapeStyle");
    desc105.putObject(idT, idshapeStyle, desc106);
    executeAction(idsetd, desc105, DialogModes.NO);
};

var getSVGfill = function (layer, svgData) {
    var fillInfo = {};
    var classId = layer.match(/class=\"([\s\S]+?)\"/);
    var opacity, fill;
    
    if (classId != null) { 
        classId = classId[1];
        var classObject = getById(classes, classId);
        
        try {
            opacity = classObject.fillOpacity;
        } catch (e) {
            // Ignore error
        }
        
        try {
            fill = classObject.fill;
        } catch (e) {
            // Ignore error
        }
    } else {
        var fillRegex = new RegExp(/fill.\"([^\"]*)\"/);
        var opacityRegex = new RegExp(/fill-opacity.\"([^\"]*)\"/);
        var style = layer.match(/\sstyle=\"([^\"]*)\"/);
        
        if (style != null) { 
            layer = style[1];
            fillRegex = new RegExp(/fill:\s*([^;\"]*)/);
            opacityRegex = new RegExp(/fill-opacity:\s*([^;\"]*)/);
        }
        
        opacity = layer.match(opacityRegex);
        
        if (opacity != null) { 
            opacity = opacity[1];
        }
        
        fill = layer.match(fillRegex);
        
        if (fill != null) { 
            fill = fill[1];
        }
    }
    
    if (opacity != null) { 
        fillInfo.opacity = opacity * 100;
    } else {
        fillInfo.opacity = 100;
    }
    
    fillInfo.color = new SolidColor();
    fillInfo.color.rgb.hexValue = "000000";
    
    if (fill != null) { 
        if (fill == "") { 
            fill = "none";
        }
    } else {
        fillInfo.type = "solid";
        return fillInfo;
    }
    
    var fillLowerCase = fill.toLowerCase();
    
    if (fillLowerCase.startsWith("#")) { 
        fillInfo.type = "solid";
        
        if (fill.length < 7) { 
            fillInfo.color.rgb.hexValue = fill.charAt(1) + fill.charAt(1) + fill.charAt(2) + fill.charAt(2) + fill.charAt(3) + fill.charAt(3);
        } else {
            fillInfo.color.rgb.hexValue = fill.replace("#", "");
        }
    } else if (fillLowerCase.startsWith("rgb(")) {
        var rgbArrray = fillLowerCase.match(/\(([^\)]*)\)/)[1].split(",");
        fillInfo.type = "solid";
        fillInfo.color.rgb.red = parseFloat(rgbArrray[0].replace(/\s/g, ""));
        fillInfo.color.rgb.green = parseFloat(rgbArrray[1].replace(/\s/g, ""));
        fillInfo.color.rgb.blue = parseFloat(rgbArrray[2].replace(/\s/g, ""));
    } else if (fillLowerCase.startsWith("url")) {
        fillInfo.type = "gradient";
        fillInfo.gradientId = fill.match(/\(#([^\)]+)\)/)[1];
    } else {
        fillInfo.type = "solid";
        fillInfo.color.rgb.hexValue = colourNameToHex(fill);
        
        if (fill == "none") { 
            fillInfo.type = "none";
        }
    }
    
    return fillInfo;
};

var getSVGstroke = function (layer, svgData, doc) {
    var strokeInfo = {};
    var classId = layer.match(/class=\"([\s\S]+?)\"/);
    var opacity, color, width, lineCap, lineJoin;
    
    if (classId != null) { 
        classId = classId[1];
        var classObject = getById(classes, classId);
        
        try {
            opacity = classObject.strokeOpacity;
        } catch (e) {
            // Ignore error
        }
        
        try {
            color = classObject.stroke;
        } catch (e) {
            // Ignore error
        }
        
        try {
            width = classObject.strokeWidth;
        } catch (e) {
            // Ignore error
        }
        
        try {
            lineCap = classObject.lineCap;
        } catch (e) {
            // Ignore error
        }
        
        try {
            lineJoin = classObject.lineJoin;
        } catch (e) {
            // Ignore error
        }
    } else {
        var colorRegex = new RegExp(/stroke.\"([^\"]*)\"/);
        var widthRegex = new RegExp(/stroke-width.\"(\d*\.?\d*)(.*)\"/);
        var opacityRegex = new RegExp(/stroke-opacity.\"([^\"]*)\"/);
        var lineCapRegex = new RegExp(/stroke-linecap=\"(.+?)\"+?/);
        var lineJoinRegex = new RegExp(/stroke-linejoin=\"(.+?)\"+?/);
        var style = layer.match(/\sstyle=\"([^\"]*)\"/);
        
        if (style != null) { 
            layer = style[1];
            colorRegex = new RegExp(/stroke:\s*([^;\"]*)/);
            widthRegex = new RegExp(/stroke-width:\s*(\d*\.?\d*)([^\";]*)/);
            opacityRegex = new RegExp(/stroke-opacity:\s*([^;\"]*)/);
            lineCapRegex = new RegExp(/stroke-linecap:\s*([^;\"]*)/);
            lineJoinRegex = new RegExp(/stroke-linejoin:\s*([^;\"]*)/);
        }
        
        opacity = layer.match(opacityRegex);
        
        if (opacity != null) { 
            opacity = opacity[1];
        }
        
        color = layer.match(colorRegex);
        
        if (color != null) { 
            color = color[1];
        }
        
        width = layer.match(widthRegex);
        lineCap = layer.match(lineCapRegex);
        
        if (lineCap != null) { 
            lineCap = lineCap[1];
        }
        
        lineJoin = layer.match(lineJoinRegex);
        
        if (lineJoin != null) { 
            lineJoin = lineJoin[1];
        }
    }
    
    if (opacity != null) { 
        strokeInfo.opacity = opacity * 100;
    } else {
        strokeInfo.opacity = 100;
    }
    
    if (width == null) { 
        width = ["1px", 1, "px"];
    }
    
    if (width[2]) { 
        width[2] = width[2].replace(" ", "");
    } else {
        width = [width[0], width[1], "px"];
    }
    
    if (lineCap == null) { 
        strokeInfo.lineCap = "butt";
    } else {
        strokeInfo.lineCap = lineCap.replace(/\s/g, "").toLowerCase();
    }
    
    if (lineJoin == null) { 
        strokeInfo.lineJoin = "miter";
    } else {
        strokeInfo.lineJoin = lineJoin.replace(/\s/g, "").toLowerCase();
    }
    
    if ((color == null) || (color == "none")) { 
        strokeInfo.type = "none";
        return strokeInfo;
    }
    
    var colorLowerCase = color.toLowerCase();
    
    if (colorLowerCase.startsWith("#")) { 
        strokeInfo.type = "solid";
        strokeInfo.color = new SolidColor();
        
        if (colorLowerCase.length < 7) { 
            strokeInfo.color.rgb.hexValue = color.charAt(1) + color.charAt(1) + color.charAt(2) + color.charAt(2) + color.charAt(3) + color.charAt(3);
        } else {
            strokeInfo.color.rgb.hexValue = color.replace("#", "");
        }
    } else if (colorLowerCase.startsWith("rgb(")) {
        var rgbArrray = colorLowerCase.match(/\(([^\)]*)\)/)[1].split(",");
        strokeInfo.type = "solid";
        strokeInfo.color = new SolidColor();
        strokeInfo.color.rgb.red = parseFloat(rgbArrray[0].replace(/\s/g, ""));
        strokeInfo.color.rgb.green = parseFloat(rgbArrray[1].replace(/\s/g, ""));
        strokeInfo.color.rgb.blue = parseFloat(rgbArrray[2].replace(/\s/g, ""));
    } else if (colorLowerCase.startsWith("url")) {
        strokeInfo.type = "gradient";
    } else {
        strokeInfo.type = "solid";
        strokeInfo.color = new SolidColor();
        strokeInfo.color.rgb.hexValue = colourNameToHex(color);
    }
    
    strokeInfo.width = toPixels(doc, width[1], width[2]);
    return strokeInfo;
};

var toPixels = function (doc, value, unit, axis) {
    var valueInPixels;
    
    switch (unit.toLowerCase()) { 
        case "pt":
            valueInPixels = parseFloat(value) * 1.25;
            break;
            
        case "pc":
            valueInPixels = parseFloat(value) * 15;
            break;
            
        case "mm":
            valueInPixels = parseFloat(value) * 3.543307;
            break;
            
        case "cm":
            valueInPixels = parseFloat(value) * 35.43307;
            break;
            
        case "in":
            valueInPixels = parseFloat(value) * 90;
            break;
            
        case "%":
            var viewportSize;
            
            if (axis == "x") { 
                viewportSize = doc.width.value;
            } else if (axis == "y") {
                viewportSize = doc.height.value;
            } else {
                viewportSize = Math.sqrt((doc.width.value * doc.width.value) + (doc.height.value * doc.height.value)) / Math.sqrt(2);
            }
            
            valueInPixels = Math.round((parseFloat(value) / 100) * viewportSize * 100) / 100;
            break;
            
        default:
            valueInPixels = parseFloat(value);
            break;
    }
    
    return valueInPixels;
};

var resizeActiveDocUsingPixels = function (width, height) {
    var idImgS = charIDToTypeID("ImgS");
    var desc16 = new ActionDescriptor();
    
    if (width != null) { 
        var idWdth = charIDToTypeID("Wdth");
        var idPxl = charIDToTypeID("#Pxl");
        desc16.putUnitDouble(idWdth, idPxl, width);
    }
    
    if (height != null) { 
        var idHght = charIDToTypeID("Hght");
        var idPxl = charIDToTypeID("#Pxl");
        desc16.putUnitDouble(idHght, idPxl, height);
    }
    
    if ((width == null) || (height == null)) { 
        var idscaleStyles = stringIDToTypeID("scaleStyles");
        desc16.putBoolean(idscaleStyles, true);
        var idCnsP = charIDToTypeID("CnsP");
        desc16.putBoolean(idCnsP, true);
    }
    
    var idIntr = charIDToTypeID("Intr");
    var idIntp = charIDToTypeID("Intp");
    var idBcbc = charIDToTypeID("Bcbc");
    desc16.putEnumerated(idIntr, idIntp, idBcbc);
    executeAction(idImgS, desc16, DialogModes.NO);
};

var lineDistance = function (x1, y1, x2, y2) {
    var xs = 0;
    var ys = 0;
    xs = x2 - x1;
    xs = xs * xs;
    ys = y2 - y1;
    ys = ys * ys;
    return Math.sqrt(xs + ys);
};

Math.radians = function (degrees) {
    return (degrees * Math.PI) / 180;
};

Math.degrees = function (radians) {
    return (radians * 180) / Math.PI;
};

var computeBorderAngle = function (h, w) {
    return 180 - Math.degrees(Math.atan(h / w));
};

var computeLength = function (workAngle, h, w, borderAngle) {
    if (workAngle <= 0) { 
        workAngle = workAngle + 360;
    }
    
    if (workAngle > 180) { 
        workAngle = workAngle - 180;
    }
    
    if (workAngle < 90) { 
        workAngle = 90 + (90 - workAngle);
    }
    
    if (workAngle >= borderAngle) { 
        return w * Math.sqrt(Math.pow(Math.tan(Math.radians(180 - workAngle)), 2) + 1);
    } else {
        if (workAngle < borderAngle) { 
            return h * Math.sqrt(Math.pow(Math.tan(Math.radians(workAngle - 90)), 2) + 1);
        }
    }
    
    return 1;
};

var valueToPercent = function (valueArray, elementSizeInPixels) {
    if (valueArray[2] == "%") { 
        return parseFloat(valueArray[1]);
    } else {
        return (parseFloat(valueArray[1]) / elementSizeInPixels) * 100;
    }
};

var applyGradient = function (gradient) {
    if (gradient == undefined) { 
        return;
    }
    
    if (gradient.xlink != undefined) { 
        var referencedGradient = getById(gradients, gradient.xlink);
        gradient.stops = referencedGradient.stops.slice();
    }
    
    var type = gradient.type;
    
    if (type == "linear") { 
        type = "Lnr ";
    } else {
        if (type == "radial") { 
            type = "Rdl ";
        }
    }
    
    var angle = 45;
    var realAngle = 45;
    var offsetX = 0;
    var offsetY = 0;
    var scale = 100;
    var widthFactor = 1;
    var heightFactor = 1;
    var layerBounds = app.activeDocument.activeLayer.bounds;
    var layerWidth = layerBounds[2].value - layerBounds[0].value;
    var layerHeight = layerBounds[3].value - layerBounds[1].value;
    var borderAngle = computeBorderAngle(layerHeight, layerWidth);
    
    switch (gradient.units) { 
        case "userSpaceOnUse":
            if (layerWidth > layerHeight) { 
                widthFactor = layerWidth / layerHeight;
            } else {
                if (layerHeight > layerWidth) { 
                    heightFactor = layerHeight / layerWidth;
                }
            }
            break;
            
        default:
            if (layerWidth > layerHeight) { 
                widthFactor = layerHeight / layerWidth;
            } else {
                if (layerHeight > layerWidth) { 
                    heightFactor = layerWidth / layerHeight;
                }
            }
            break;
    }
    
    if (gradient.type == "linear") { 
        var gradientX1 = valueToPercent(gradient.x1, layerWidth);
        var gradientY1 = valueToPercent(gradient.y1, layerHeight);
        var gradientX2 = valueToPercent(gradient.x2, layerWidth);
        var gradientY2 = valueToPercent(gradient.y2, layerHeight);
        var gradientPxX1 = (gradientX1 / 100) * layerWidth;
        var gradientPxY1 = (gradientY1 / 100) * layerHeight;
        var gradientPxX2 = (gradientX2 / 100) * layerWidth;
        var gradientPxY2 = (gradientY2 / 100) * layerHeight;
        angle = (Math.atan2(parseFloat(gradientY2 * heightFactor) - parseFloat(gradientY1 * heightFactor), parseFloat(gradientX2 * widthFactor) - parseFloat(gradientX1 * widthFactor)) * -180) / Math.PI;
        realAngle = (Math.atan2(parseFloat(gradientPxY2) - parseFloat(gradientPxY1), parseFloat(gradientPxX2) - parseFloat(gradientPxX1)) * -180) / Math.PI;
        var totalLength = computeLength(realAngle, layerHeight, layerWidth, borderAngle);
        var vectorLength = lineDistance(gradientPxX1, gradientPxY1, gradientPxX2, gradientPxY2);
        var lengthFactor = vectorLength / totalLength;
        var offsetRegion = {};
        
        if (realAngle == -90) { 
            offsetRegion.width = gradientPxX1;
            offsetRegion.height = gradientPxY1;
        } else if (realAngle == 90) {
            offsetRegion.width = gradientPxX1;
            offsetRegion.height = layerHeight - gradientPxY1;
        } else if (realAngle == 0) {
            offsetRegion.width = gradientPxX1;
            offsetRegion.height = gradientPxY1;
        } else if (realAngle == -180) {
            offsetRegion.width = layerWidth - gradientPxX1;
            offsetRegion.height = gradientPxY1;
        } else if ((realAngle > 90) && (realAngle < 180)) {
            offsetRegion.width = gradientPxX2;
            offsetRegion.height = gradientPxY2;
        } else if ((realAngle > -180) && (realAngle < -90)) {
            offsetRegion.width = gradientPxX2;
            offsetRegion.height = layerHeight - gradientPxY2;
        } else if ((realAngle < 0) && (realAngle > -90)) {
            offsetRegion.width = layerWidth - gradientPxX2;
            offsetRegion.height = layerHeight - gradientPxY2;
        } else if ((realAngle < 90) && (realAngle > 0)) {
            offsetRegion.width = layerWidth - gradientPxX2;
            offsetRegion.height = gradientPxY2;
        } else {
            offsetRegion.width = 0;
            offsetRegion.height = 0;
        }
        
        var offsetLength = computeLength(realAngle, offsetRegion.height, offsetRegion.width, borderAngle);
        offsetLength = (offsetLength / totalLength) * 100;
    } else {
        var lengthFactor = 1;
        var offsetLength = 0;
        var gradientX1 = valueToPercent(gradient.cx, layerWidth);
        var gradientY1 = valueToPercent(gradient.cy, layerHeight);
        offsetX = gradientX1 - 50;
        offsetY = gradientY1 - 50;
        var gradientPxX1 = (gradientX1 / 100) * layerWidth;
        var gradientPxY1 = (gradientY1 / 100) * layerHeight;
        
        if (layerWidth > layerHeight) { 
            angle = 0;
        } else {
            angle = 90;
        }
        
        var viewportSize = Math.sqrt((layerWidth * layerWidth) + (layerHeight * layerHeight)) / Math.sqrt(2);
        var radiusPixels;
        
        if (gradient.r[2] != "%") { 
            radiusPixels = parseFloat(gradient.r[1]);
        } else {
            radiusPixels = (parseFloat(gradient.r[1]) / 100) * viewportSize;
        }
        
        var totalLength = computeLength(angle, layerHeight, layerWidth, borderAngle);
        scale = (totalLength / radiusPixels) * 100;
    }
    
    var colorList = new ActionList();
    var opacityList = new ActionList();
    var numberOfStops = gradient.stops.length;
    
    for (var i = 0; i < numberOfStops; i += 1) { 
        var thisStop = gradient.stops[i];
        var thisColor = new ActionDescriptor();
        var idClr = charIDToTypeID("Clr ");
        
        if (thisStop.hasOwnProperty("color")) { 
            var solidColor = new SolidColor();
            var colorString = thisStop.color.toLowerCase().replace(/ /g, "");
            
            if (colorString.startsWith("#")) { 
                if (colorString.length < 7) { 
                    solidColor.rgb.hexValue = colorString.charAt(1) + colorString.charAt(1) + colorString.charAt(2) + colorString.charAt(2) + colorString.charAt(3) + colorString.charAt(3);
                } else {
                    solidColor.rgb.hexValue = colorString.replace("#", "");
                }
            } else if (colorString.startsWith("rgb(")) {
                var rgbArrray = colorString.match(/\(([^\)]*)\)/)[1].split(",");
                solidColor.rgb.red = parseFloat(rgbArrray[0].replace(/\s/g, ""));
                solidColor.rgb.green = parseFloat(rgbArrray[1].replace(/\s/g, ""));
                solidColor.rgb.blue = parseFloat(rgbArrray[2].replace(/\s/g, ""));
            } else {
                solidColor.rgb.hexValue = colourNameToHex(colorString);
            }
            
            var desc78 = new ActionDescriptor();
            var idRd = charIDToTypeID("Rd  ");
            desc78.putDouble(idRd, solidColor.rgb.red);
            var idGrn = charIDToTypeID("Grn ");
            desc78.putDouble(idGrn, solidColor.rgb.green);
            var idBl = charIDToTypeID("Bl  ");
            desc78.putDouble(idBl, solidColor.rgb.blue);
        } else {
            var desc78 = new ActionDescriptor();
            var idRd = charIDToTypeID("Rd  ");
            desc78.putDouble(idRd, 0);
            var idGrn = charIDToTypeID("Grn ");
            desc78.putDouble(idGrn, 0);
            var idBl = charIDToTypeID("Bl  ");
            desc78.putDouble(idBl, 0);
        }
        
        var idRGBC = charIDToTypeID("RGBC");
        thisColor.putObject(idClr, idRGBC, desc78);
        var idType = charIDToTypeID("Type");
        var idClry = charIDToTypeID("Clry");
        var idUsrS = charIDToTypeID("UsrS");
        thisColor.putEnumerated(idType, idClry, idUsrS);
        var idLctn = charIDToTypeID("Lctn");
        var location = parseFloat(thisStop.location);
        location = (((location * lengthFactor) + offsetLength) / 100) * 4096;
        thisColor.putInteger(idLctn, location);
        var idMdpn = charIDToTypeID("Mdpn");
        thisColor.putInteger(idMdpn, 50);
        var idClrt = charIDToTypeID("Clrt");
        colorList.putObject(idClrt, thisColor);
        var desc83 = new ActionDescriptor();
        var idOpct = charIDToTypeID("Opct");
        var idPrc = charIDToTypeID("#Prc");
        
        if (thisStop.hasOwnProperty("opacity")) { 
            desc83.putUnitDouble(idOpct, idPrc, parseFloat(thisStop.opacity) * 100);
        } else {
            desc83.putUnitDouble(idOpct, idPrc, 100);
        }
        
        var idLctn = charIDToTypeID("Lctn");
        desc83.putInteger(idLctn, location);
        var idMdpn = charIDToTypeID("Mdpn");
        desc83.putInteger(idMdpn, 50);
        var idTrnS = charIDToTypeID("TrnS");
        opacityList.putObject(idTrnS, desc83);
    }
    
    if (PSversion >= 13) { 
        var idsetd = charIDToTypeID("setd");
        var desc72 = new ActionDescriptor();
        var idnull = charIDToTypeID("null");
        var ref8 = new ActionReference();
        var idcontentLayer = stringIDToTypeID("contentLayer");
        var idOrdn = charIDToTypeID("Ordn");
        var idTrgt = charIDToTypeID("Trgt");
        ref8.putEnumerated(idcontentLayer, idOrdn, idTrgt);
        desc72.putReference(idnull, ref8);
        var idT = charIDToTypeID("T   ");
        var desc73 = new ActionDescriptor();
        var idFlCn = charIDToTypeID("FlCn");
        var desc74 = new ActionDescriptor();
        var idDthr = charIDToTypeID("Dthr");
        desc74.putBoolean(idDthr, true);
        var idRvrs = charIDToTypeID("Rvrs");
        desc74.putBoolean(idRvrs, false);
        var idAngl = charIDToTypeID("Angl");
        var idAng = charIDToTypeID("#Ang");
        desc74.putUnitDouble(idAngl, idAng, angle);
        var idType = charIDToTypeID("Type");
        var idGrdT = charIDToTypeID("GrdT");
        var idLnr = charIDToTypeID(type);
        desc74.putEnumerated(idType, idGrdT, idLnr);
        var idAlgn = charIDToTypeID("Algn");
        desc74.putBoolean(idAlgn, true);
        var idScl = charIDToTypeID("Scl ");
        var idPrc = charIDToTypeID("#Prc");
        desc74.putUnitDouble(idScl, idPrc, scale);
        var idOfst = charIDToTypeID("Ofst");
        var desc75 = new ActionDescriptor();
        var idHrzn = charIDToTypeID("Hrzn");
        var idPrc = charIDToTypeID("#Prc");
        desc75.putUnitDouble(idHrzn, idPrc, offsetX);
        var idVrtc = charIDToTypeID("Vrtc");
        var idPrc = charIDToTypeID("#Prc");
        desc75.putUnitDouble(idVrtc, idPrc, offsetY);
        var idPnt = charIDToTypeID("Pnt ");
        desc74.putObject(idOfst, idPnt, desc75);
        var idGrad = charIDToTypeID("Grad");
        var desc76 = new ActionDescriptor();
        var idNm = charIDToTypeID("Nm  ");
        desc76.putString(idNm, "Gray, White");
        var idGrdF = charIDToTypeID("GrdF");
        var idGrdF = charIDToTypeID("GrdF");
        var idCstS = charIDToTypeID("CstS");
        desc76.putEnumerated(idGrdF, idGrdF, idCstS);
        var idIntr = charIDToTypeID("Intr");
        desc76.putDouble(idIntr, 4096);
    } else {
        var idsetd = charIDToTypeID("setd");
        var desc15 = new ActionDescriptor();
        var idnull = charIDToTypeID("null");
        var ref5 = new ActionReference();
        var idPrpr = charIDToTypeID("Prpr");
        var idLefx = charIDToTypeID("Lefx");
        ref5.putProperty(idPrpr, idLefx);
        var idLyr = charIDToTypeID("Lyr ");
        var idOrdn = charIDToTypeID("Ordn");
        var idTrgt = charIDToTypeID("Trgt");
        ref5.putEnumerated(idLyr, idOrdn, idTrgt);
        desc15.putReference(idnull, ref5);
        var idT = charIDToTypeID("T   ");
        var desc16 = new ActionDescriptor();
        var idScl = charIDToTypeID("Scl ");
        var idPrc = charIDToTypeID("#Prc");
        desc16.putUnitDouble(idScl, idPrc, scale);
        var idGrFl = charIDToTypeID("GrFl");
        var desc17 = new ActionDescriptor();
        var idenab = charIDToTypeID("enab");
        desc17.putBoolean(idenab, true);
        var idpresent = stringIDToTypeID("present");
        desc17.putBoolean(idpresent, true);
        var idshowInDialog = stringIDToTypeID("showInDialog");
        desc17.putBoolean(idshowInDialog, true);
        var idMd = charIDToTypeID("Md  ");
        var idBlnM = charIDToTypeID("BlnM");
        var idNrml = charIDToTypeID("Nrml");
        desc17.putEnumerated(idMd, idBlnM, idNrml);
        var idOpct = charIDToTypeID("Opct");
        var idPrc = charIDToTypeID("#Prc");
        desc17.putUnitDouble(idOpct, idPrc, 100);
        var idGrad = charIDToTypeID("Grad");
        var desc76 = new ActionDescriptor();
        var idNm = charIDToTypeID("Nm  ");
        desc76.putString(idNm, "Custom");
        var idGrdF = charIDToTypeID("GrdF");
        var idGrdF = charIDToTypeID("GrdF");
        var idCstS = charIDToTypeID("CstS");
        desc76.putEnumerated(idGrdF, idGrdF, idCstS);
        var idIntr = charIDToTypeID("Intr");
        desc76.putDouble(idIntr, 4096);
    }
    
    var idClrs = charIDToTypeID("Clrs");
    desc76.putList(idClrs, colorList);
    var idTrns = charIDToTypeID("Trns");
    desc76.putList(idTrns, opacityList);
    
    if (PSversion >= 13) { 
        var idGrdn = charIDToTypeID("Grdn");
        desc74.putObject(idGrad, idGrdn, desc76);
        var idgradientLayer = stringIDToTypeID("gradientLayer");
        desc73.putObject(idFlCn, idgradientLayer, desc74);
        var idstrokeStyle = stringIDToTypeID("strokeStyle");
        var desc86 = new ActionDescriptor();
        var idstrokeStyleVersion = stringIDToTypeID("strokeStyleVersion");
        desc86.putInteger(idstrokeStyleVersion, 2);
        var idfillEnabled = stringIDToTypeID("fillEnabled");
        desc86.putBoolean(idfillEnabled, true);
        var idstrokeStyle = stringIDToTypeID("strokeStyle");
        desc73.putObject(idstrokeStyle, idstrokeStyle, desc86);
        var idshapeStyle = stringIDToTypeID("shapeStyle");
        desc72.putObject(idT, idshapeStyle, desc73);
        executeAction(idsetd, desc72, DialogModes.NO);
    } else {
        var idGrdn = charIDToTypeID("Grdn");
        desc17.putObject(idGrad, idGrdn, desc76);
        var idAngl = charIDToTypeID("Angl");
        var idAng = charIDToTypeID("#Ang");
        desc17.putUnitDouble(idAngl, idAng, angle);
        var idType = charIDToTypeID("Type");
        var idGrdT = charIDToTypeID("GrdT");
        var idRdl = charIDToTypeID(type);
        desc17.putEnumerated(idType, idGrdT, idRdl);
        var idRvrs = charIDToTypeID("Rvrs");
        desc17.putBoolean(idRvrs, false);
        var idDthr = charIDToTypeID("Dthr");
        desc17.putBoolean(idDthr, false);
        var idAlgn = charIDToTypeID("Algn");
        desc17.putBoolean(idAlgn, true);
        var idScl = charIDToTypeID("Scl ");
        var idPrc = charIDToTypeID("#Prc");
        desc17.putUnitDouble(idScl, idPrc, scale);
        var idOfst = charIDToTypeID("Ofst");
        var desc28 = new ActionDescriptor();
        var idHrzn = charIDToTypeID("Hrzn");
        var idPrc = charIDToTypeID("#Prc");
        desc28.putUnitDouble(idHrzn, idPrc, offsetX);
        var idVrtc = charIDToTypeID("Vrtc");
        var idPrc = charIDToTypeID("#Prc");
        desc28.putUnitDouble(idVrtc, idPrc, offsetY);
        var idPnt = charIDToTypeID("Pnt ");
        desc17.putObject(idOfst, idPnt, desc28);
        var idGrFl = charIDToTypeID("GrFl");
        desc16.putObject(idGrFl, idGrFl, desc17);
        var idLefx = charIDToTypeID("Lefx");
        desc15.putObject(idT, idLefx, desc16);
        executeAction(idsetd, desc15, DialogModes.NO);
    }
};

var translateActiveLayer = function (deltaX, deltaY) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);
    var coords = new ActionDescriptor();
    coords.putUnitDouble(charIDToTypeID("Hrzn"), charIDToTypeID("#Pxl"), deltaX);
    coords.putUnitDouble(charIDToTypeID("Vrtc"), charIDToTypeID("#Pxl"), deltaY);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Ofst"), coords);
    executeAction(charIDToTypeID("move"), desc, DialogModes.NO);
};

var freeTransformActiveLayer = function (widthPercent, heightPercent, angle, pivotX, pivotY) {
    var idTrnf = charIDToTypeID("Trnf");
    var desc5 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref3 = new ActionReference();
    var idLyr = charIDToTypeID("Lyr ");
    var idOrdn = charIDToTypeID("Ordn");
    var idTrgt = charIDToTypeID("Trgt");
    ref3.putEnumerated(idLyr, idOrdn, idTrgt);
    desc5.putReference(idnull, ref3);
    var idFTcs = charIDToTypeID("FTcs");
    var idQCSt = charIDToTypeID("QCSt");
    var idQcsi = charIDToTypeID("Qcsi");
    desc5.putEnumerated(idFTcs, idQCSt, idQcsi);
    var idPstn = charIDToTypeID("Pstn");
    var desc6 = new ActionDescriptor();
    var idHrzn = charIDToTypeID("Hrzn");
    var idPxl = charIDToTypeID("#Pxl");
    desc6.putUnitDouble(idHrzn, idPxl, pivotX);
    var idVrtc = charIDToTypeID("Vrtc");
    var idPxl = charIDToTypeID("#Pxl");
    desc6.putUnitDouble(idVrtc, idPxl, pivotY);
    var idPnt = charIDToTypeID("Pnt ");
    desc5.putObject(idPstn, idPnt, desc6);
    var idOfst = charIDToTypeID("Ofst");
    var desc7 = new ActionDescriptor();
    var idHrzn = charIDToTypeID("Hrzn");
    var idPxl = charIDToTypeID("#Pxl");
    desc7.putUnitDouble(idHrzn, idPxl, -0);
    var idVrtc = charIDToTypeID("Vrtc");
    var idPxl = charIDToTypeID("#Pxl");
    desc7.putUnitDouble(idVrtc, idPxl, 0);
    var idOfst = charIDToTypeID("Ofst");
    desc5.putObject(idOfst, idOfst, desc7);
    var idWdth = charIDToTypeID("Wdth");
    var idPrc = charIDToTypeID("#Prc");
    desc5.putUnitDouble(idWdth, idPrc, widthPercent);
    var idHght = charIDToTypeID("Hght");
    var idPrc = charIDToTypeID("#Prc");
    desc5.putUnitDouble(idHght, idPrc, heightPercent);
    var idAngl = charIDToTypeID("Angl");
    var idAng = charIDToTypeID("#Ang");
    desc5.putUnitDouble(idAngl, idAng, angle);
    executeAction(idTrnf, desc5, DialogModes.NO);
};

var convertToPath = function (layer) {
    var tag = layer.match(/^<\/*[a-z]*/).toString();
    
    switch (tag) { 
        case "<rect":
            var x = layer.match(/x=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (x == null) { 
                x = ["0px", "0", "px"];
            }
            
            x = toPixels(app.activeDocument, x[1], x[2], "x");
            var y = layer.match(/y=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (y == null) { 
                y = ["0px", "0", "px"];
            }
            
            y = toPixels(app.activeDocument, y[1], y[2], "y");
            var width = layer.match(/\swidth=\"(\d*\.?\d*)([^\"]*)\"/);
            width = toPixels(app.activeDocument, width[1], width[2], "x");
            var height = layer.match(/\sheight=\"(\d*\.?\d*)([^\"]*)\"/);
            height = toPixels(app.activeDocument, height[1], height[2], "y");
            var radiusx = layer.match(/rx=\"(\d*\.?\d*)([^\"]*)\"/);
            
            if (radiusx == null) { 
                radiusx = 0;
            } else {
                radiusx = toPixels(app.activeDocument, radiusx[1], radiusx[2], "x");
            }
            
            var radiusy = layer.match(/ry=\"(\d*\.?\d*)([^\"]*)\"/);
            
            if (radiusy == null) { 
                radiusy = radiusx;
            } else {
                radiusy = toPixels(app.activeDocument, radiusy[1], radiusy[2], "y");
            }
            
            var d = "";
            
            if (radiusx > 0) {
                d = "M" + (parseFloat(x) + parseFloat(radiusx)) + "," + parseFloat(y);
                d += " L" + ((parseFloat(x) + parseFloat(width)) - parseFloat(radiusx)) + "," + parseFloat(y);
                d += " A" + radiusx + "," + radiusy + " 0 0,1 " + (parseFloat(x) + parseFloat(width)) + "," + (parseFloat(y) + parseFloat(radiusy));
                d += " L" + (parseFloat(x) + parseFloat(width)) + "," + ((parseFloat(y) + parseFloat(height)) - parseFloat(radiusy));
                d += " A" + radiusx + "," + radiusy + " 0 0,1 " + ((parseFloat(x) + parseFloat(width)) - parseFloat(radiusx)) + "," + (parseFloat(y) + parseFloat(height));
                d += " L" + (parseFloat(x) + parseFloat(radiusx)) + "," + (parseFloat(y) + parseFloat(height));
                d += " A" + radiusx + "," + radiusy + " 0 0,1 " + parseFloat(x) + "," + ((parseFloat(y) + parseFloat(height)) - parseFloat(radiusy));
                d += " L" + parseFloat(x) + "," + (parseFloat(y) + parseFloat(radiusy));
                d += " A" + radiusx + "," + radiusy + " 0 0,1 " + (parseFloat(x) + parseFloat(radiusx)) + "," + parseFloat(y);
            } else {
                d = "M" + parseFloat(x) + "," + parseFloat(y);
                d += " L" + (parseFloat(x) + parseFloat(width)) + "," + parseFloat(y);
                d += " L" + (parseFloat(x) + parseFloat(width)) + "," + (parseFloat(y) + parseFloat(height));
                d += " L" + parseFloat(x) + "," + (parseFloat(y) + parseFloat(height));
                d += " L" + parseFloat(x) + "," + parseFloat(y);
            }
            
            d += "z";
            layer = layer.replace("<rect", "<path d=\"" + d + "\"");
            break;
            
        case "<circle":
            break;
            
        case "<ellipse":
            break;
            
        case "<line":
            break;
            
        case "<text":
            break;
    }
    
    return layer;
};

var PSversion = parseInt(app.version.split(".")[0]);
var gradients = [];
var classes = [];
app.preferences.rulerUnits = Units.PIXELS;

var drawSVG = function (svgFile) {
    gradients = [];
    classes = [];
    
    var dlgProgress = new Window("palette");
    dlgProgress.preferredSize = [300, 120];
    dlgProgress.orientation = "column";
    dlgProgress.alignChildren = ["center", "center"];
    dlgProgress.readout = dlgProgress.add("statictext", undefined, "Importing " + svgFile.name);
    dlgProgress.readout.minimumSize = [260, -1];
    dlgProgress.readout.justify = "center";
    dlgProgress.show();
    
    svgFile.open("r");
    var svgData = svgFile.read();
    
    var viewBox = svgData.match(/<svg[^>]*(viewBox=\"[^\"]*)"/);
    
    if (viewBox != null) { 
        viewBox = viewBox[1].toString();
        viewBox = viewBox.replace(/,/gi, " ");
        viewBox = viewBox.replace(/\s+/g, " ");
        viewBox = viewBox.split(" ");
    }
    
    var svgWidth = svgData.toLowerCase().match(/<svg[^>]*width=\"(\d*\.?\d*)([^\"]*)\"/);
    var svgHeight = svgData.toLowerCase().match(/<svg[^>]*height=\"(\d*\.?\d*)([^\"]*)\"/);
    var docWidth, docHeight;
    
    if (viewBox != null) { 
        docWidth = parseFloat(viewBox[2]);
        docHeight = parseFloat(viewBox[3]);
    } else {
        docWidth = svgWidth != null ? toPixels(null, svgWidth[1], svgWidth[2]) : 600;
        docHeight = svgHeight != null ? toPixels(null, svgHeight[1], svgHeight[2]) : 600;
    }
    
    var docRef;
    
    // 检查是否要在活动文档中加载，并且是否存在活动文档
    if (loadInActiveDocument && app.documents.length > 0) {
        docRef = app.activeDocument;
    } else {
        docRef = app.documents.add(new UnitValue(docWidth, "px"), new UnitValue(docHeight, "px"), 72, svgFile.displayName, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    }
    
    var svgGroupLayer = docRef.layerSets.add();
    svgGroupLayer.name = svgFile.displayName.substring(0, svgFile.displayName.length - 4);
    
    var comments = svgData.match(/<!--[\s\S]+?-->/g, "");
    var numberOfComments = 0;
    
    if (comments != null) { 
        numberOfComments = comments.length;
    }
    
    for (var c = 0; c < numberOfComments; c += 1) { 
        svgData = svgData.replace(comments[c], "");
    }
    
    var styles = svgData.match(/<style.*>([\s\S]+?)<\/style>/);
    
    if (styles != null) { 
        styles = styles[1].toString();
        var classesInStyle = styles.match(/\.[\s\S]+?}/g);
        var numberOfClasses = classesInStyle.length;
        
        for (var c = 0; c < numberOfClasses; c += 1) { 
            var currentClass = classesInStyle[c];
            var classObject = {};
            classObject.id = currentClass.match(/\.([\s\S]+?){/)[1].replace(/ /g, "");
            classObject.fill = currentClass.match(/fill:([\s\S]+?);/);
            
            if (classObject.fill != null) { 
                classObject.fill = classObject.fill[1].replace(/ /g, "");
            } else {
                classObject.fill = "#000000";
            }
            
            classObject.fillOpacity = currentClass.match(/fill-opacity:([\s\S]+?);/);
            
            if (classObject.fillOpacity != null) { 
                classObject.fillOpacity = classObject.fillOpacity[1].replace(/ /g, "");
            }
            
            classObject.stroke = currentClass.match(/stroke:([\s\S]+?);/);
            
            if (classObject.stroke != null) { 
                classObject.stroke = classObject.stroke[1].replace(/ /g, "");
            }
            
            classObject.strokeWidth = currentClass.match(/stroke-width:\s*(\d*\.?\d*)(.*)/);
            classObject.strokeOpacity = currentClass.match(/stroke-opacity:([\s\S]+?);/);
            
            if (classObject.strokeOpacity != null) { 
                classObject.strokeOpacity = classObject.strokeOpacity[1].replace(/ /g, "");
            }
            
            classObject.lineCap = currentClass.match(/stroke-linecap:\s*([^;\"]*)/);
            
            if (classObject.lineCap != null) { 
                classObject.lineCap = classObject.lineCap.replace(/\s/g, "").toLowerCase();
            }
            
            classObject.lineJoin = currentClass.match(/stroke-linejoin:\s*([^;\"]*)/);
            
            if (classObject.lineJoin != null) { 
                classObject.lineJoin = classObject.lineJoin.replace(/\s/g, "").toLowerCase();
            }
            
            var idArray = classObject.id.split(",");
            
            for (var i = 0; i < idArray.length; i += 1) { 
                var thisId = idArray[i].replace(".", "");
                var existingClass = getById(classes, thisId);
                
                if (existingClass != null) { 
                    if (classObject.fill != null) { 
                        existingClass.fill = classObject.fill;
                    }
                    
                    if (classObject.fillOpacity != null) { 
                        existingClass.fillOpacity = classObject.fillOpacity;
                    }
                    
                    if (classObject.stroke != null) { 
                        existingClass.stroke = classObject.stroke;
                    }
                    
                    if (classObject.strokeWidth != null) { 
                        existingClass.strokeWidth = classObject.strokeWidth;
                    }
                    
                    if (classObject.strokeOpacity != null) { 
                        existingClass.strokeOpacity = classObject.strokeOpacity;
                    }
                    
                    if (classObject.lineCap != null) { 
                        existingClass.lineCap = classObject.lineCap;
                    }
                    
                    if (classObject.lineJoin != null) { 
                        existingClass.lineJoin = classObject.lineJoin;
                    }
                } else {
                    var newClassObject = {};
                    newClassObject.id = thisId;
                    newClassObject.fill = classObject.fill;
                    newClassObject.fillOpacity = classObject.fillOpacity;
                    newClassObject.stroke = classObject.stroke;
                    newClassObject.strokeWidth = classObject.strokeWidth;
                    newClassObject.strokeOpacity = classObject.strokeOpacity;
                    newClassObject.lineCap = classObject.lineCap;
                    newClassObject.lineJoin = classObject.lineJoin;
                    classes.push(newClassObject);
                }
            }
        }
    }
    
    var gradientsInDef1 = svgData.match(/<\w+Gradient[^\/>]+?\/>/g);
    svgData = svgData.replace(/<\w+Gradient[^\/>]+?\/>/g, "");
    var gradientsInDef2 = svgData.match(/<\w+Gradient[\s\S]+?Gradient>/g);
    var gradientsInDef;
    
    if (gradientsInDef1 != null) { 
        gradientsInDef = gradientsInDef1.slice();
        
        if (gradientsInDef2 != null) { 
            gradientsInDef = gradientsInDef.concat(gradientsInDef2);
        }
    } else {
        try {
            gradientsInDef = gradientsInDef2.slice();
        } catch (e) {
            gradientsInDef = null;
        }
    }
    
    var numberOfGradients = 0;
    
    try {
        numberOfGradients = gradientsInDef.length;
    } catch (e) {
        // Ignore error
    }
    
    for (var g = 0; g < numberOfGradients; g += 1) { 
        var currentGradient = gradientsInDef[g];
        var gradientObject = {};
        gradientObject.id = currentGradient.match(/<.+Gradient.+?id=\"([^\"]+)\"/)[1];
        
        if (currentGradient.match(/^<linearGradient/) != null) { 
            gradientObject.type = "linear";
        } else {
            gradientObject.type = "radial";
        }
        
        gradientObject.units = currentGradient.match(/gradientUnits=\"([^\"]+)\"/);
        
        if (gradientObject.units != null) { 
            gradientObject.units = gradientObject.units[1];
        } else {
            gradientObject.units = "objectBoundingBox";
        }
        
        if (gradientObject.type == "linear") { 
            gradientObject.x1 = currentGradient.match(/x1=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (gradientObject.x1 == null) { 
                gradientObject.x1 = ["0%", "0", "%"];
            }
            
            gradientObject.y1 = currentGradient.match(/y1=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (gradientObject.y1 == null) { 
                gradientObject.y1 = ["0%", "0", "%"];
            }
            
            gradientObject.x2 = currentGradient.match(/x2=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (gradientObject.x2 == null) { 
                gradientObject.x2 = ["100%", "100", "%"];
            }
            
            gradientObject.y2 = currentGradient.match(/y2=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (gradientObject.y2 == null) { 
                gradientObject.y2 = ["0%", "0", "%"];
            }
        } else {
            gradientObject.cx = currentGradient.match(/cx=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (gradientObject.cx == null) { 
                gradientObject.cx = ["50%", "50", "%"];
            }
            
            gradientObject.cy = currentGradient.match(/cy=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (gradientObject.cy == null) { 
                gradientObject.cy = ["50%", "50", "%"];
            }
            
            gradientObject.r = currentGradient.match(/r=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (gradientObject.r == null) { 
                gradientObject.r = ["50%", "50", "%"];
            }
            
            gradientObject.fx = currentGradient.match(/fx=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (gradientObject.fx == null) { 
                gradientObject.fx = gradientObject.cx;
            }
            
            gradientObject.fy = currentGradient.match(/fy=\"(-?\d*\.?\d*)([^\"]*)\"/);
            
            if (gradientObject.fy == null) { 
                gradientObject.fy = gradientObject.cy;
            }
        }
        
        gradientObject.stops = [];
        var stops = currentGradient.match(/<stop[\s\S]+?>/g);
        
        if ((stops != null) && (stops.length != 0)) { 
            var numberOfStops = stops.length;
            
            for (var s = 0; s < numberOfStops; s += 1) { 
                var currentStop = stops[s];
                var stopObject = {};
                stopObject.location = currentStop.match(/offset=\"(\d*\.?\d*)%/);
                
                if (stopObject.location != null) { 
                    stopObject.location = stopObject.location[1];
                } else {
                    stopObject.location = currentStop.match(/offset=\"(\d*\.?\d*)/)[1] * 100;
                }
                
                stopObject.color = currentStop.match(/stop-color=\"([^\"]+)\"/);
                
                if (stopObject.color != null) { 
                    stopObject.color = stopObject.color[1];
                } else {
                    stopObject.color = currentStop.match(/stop-color:([^;\"]+)/);
                    
                    if (stopObject.color != null) { 
                        stopObject.color = stopObject.color[1];
                    } else {
                        stopObject.color = "#000000";
                    }
                }
                
                stopObject.opacity = currentStop.match(/stop-opacity=\"([^\"]+)\"/);
                
                if (stopObject.opacity != null) { 
                    stopObject.opacity = stopObject.opacity[1];
                } else {
                    stopObject.opacity = currentStop.match(/stop-opacity:([^;\"]+)/);
                    
                    if (stopObject.opacity != null) { 
                        stopObject.opacity = stopObject.opacity[1];
                    } else {
                        stopObject.opacity = 1;
                    }
                }
                
                gradientObject.stops.push(stopObject);
            }
        } else {
            var xlink = currentGradient.match(/xlink:href=\"#([^\"]+)/);
            
            if (xlink != null) { 
                gradientObject.xlink = xlink[1];
            }
        }
        
        gradients.push(gradientObject);
    }
    
    var defs = svgData.match(new RegExp(/<defs[\s\S]+?>*(<\/defs>|\/>)+?/));
    
    if (defs != null) { 
        svgData = svgData.replace(defs[0], "");
    }
    
    var clipPaths = svgData.match(/<clipPath[\s\S]+?>[\s\S]+?<\/clipPath>/);
    
    if (clipPaths != null) { 
        var numberOfClipPaths = clipPaths.length;
        
        for (var c = 0; c < numberOfClipPaths; c += 1) { 
            svgData = svgData.replace(clipPaths[c], "");
        }
    }
    
    var regex = new RegExp("<path[^>]*>|<rect[^>]*>|<circle[^>]*>|<ellipse[^>]*>|<line[^>]*>|<polyline[^>]*>|<polygon[^>]*>|<text[^>]*>|<g[^>]*>|</g[^>]*>", "g");
    var svgLayers = svgData.match(regex);
    var numberOfLayers = svgLayers.length;
    
    if (numberOfLayers == 0) { 
        try {
            dlgProgress.opacity = 0;
        } catch (e) {
            // Ignore error
        }
        
        dlgProgress.close();
        alert("This does not appear to be a valid SVG");
        return;
    }
    
    var parentArray = [docRef.activeLayer];
    var parentTransform = [null];
    
    var applyTransforms = function (commands) {
        if (commands != null) { 
            var numberOfCommands = commands.length;
            
            for (var t = 0; t < numberOfCommands; t += 1) { 
                var command = commands[t].match(/([^\(]+)\(([^\)]+)/);
                var parameters = command[2].replace(/,/g, " ");
                parameters = parameters.replace(/\s+/g, " ");
                parameters = parameters.split(" ");
                
                switch (command[1]) { 
                    case "translate":
                        var x = parseFloat(parameters[0]);
                        var y = 0;
                        
                        if (parameters[1] != null) { 
                            y = parseFloat(parameters[1]);
                        }
                        
                        translateActiveLayer(x, y);
                        break;
                        
                    case "rotate":
                        var angle = parseFloat(parameters[0]);
                        var pivotX = 0;
                        var pivotY = 0;
                        
                        if (parameters[1] != null) { 
                            pivotX = parseFloat(parameters[1]);
                        }
                        
                        if (parameters[2] != null) { 
                            pivotY = parseFloat(parameters[2]);
                        }
                        
                        freeTransformActiveLayer(100, 100, angle, pivotX, pivotY);
                        break;
                        
                    case "scale":
                        var width = parseFloat(parameters[0]) * 100;
                        var height = width;
                        
                        if (parameters[1] != null) { 
                            height = parseFloat(parameters[1]) * 100;
                        }
                        
                        freeTransformActiveLayer(width, height, 0, 0, 0);
                        break;
                }
            }
        }
    };
    
    for (var i = 0; i < numberOfLayers; i += 1) { 
        var currentLayer = svgLayers[i];
        var currentLayerName = currentLayer.match(/id=\"([^\"]+)\"/);
        
        if (currentLayerName != null) { 
            currentLayerName = currentLayerName[1];
        }
        
        var style = currentLayer.match(/\sstyle=\"([^\"]*)\"/);
        var opacity;
        
        if (style != null) { 
            style = style[1];
            var opacityRegex = new RegExp(/opacity:\s*([^\s;\"]*)/);
            opacity = style.match(opacityRegex);
        } else {
            var opacityRegex = new RegExp(/opacity.\"([^\"]*)\"/);
            opacity = currentLayer.match(opacityRegex);
        }
        
        if (opacity != null) { 
            opacity = opacity[1] * 100;
        } else {
            opacity = 100;
        }
        
        var transformString = currentLayer.match(/transform=.*?\"([^\"]+)/);
        var transform = null;
        
        if (transformString != null) { 
            transformString = transformString[1];
            
            if (transformString.match(/matrix/) != null) { 
                currentLayer = convertToPath(currentLayer);
            }
            
            transform = transformString.match(/translate\([^\)]*\)|rotate\([^\)]*\)|scale\([^\)]*\)/g);
        }
        
        var tag = currentLayer.match(/^<\/*[a-z]*/).toString();
        
        switch (tag) { 
            case "<rect":
                var x = currentLayer.match(/x=\"(-?\d*\.?\d*)([^\"]*)\"/);
                
                if (x == null) { 
                    x = ["0px", "0", "px"];
                }
                
                x = toPixels(docRef, x[1], x[2], "x");
                var y = currentLayer.match(/y=\"(-?\d*\.?\d*)([^\"]*)\"/);
                
                if (y == null) { 
                    y = ["0px", "0", "px"];
                }
                
                y = toPixels(docRef, y[1], y[2], "y");
                var width = currentLayer.match(/\swidth=\"(\d*\.?\d*)([^\"]*)\"/);
                width = toPixels(docRef, width[1], width[2], "x");
                var height = currentLayer.match(/\sheight=\"(\d*\.?\d*)([^\"]*)\"/);
                height = toPixels(docRef, height[1], height[2], "y");
                var radiusx = currentLayer.match(/rx=\"(\d*\.?\d*)([^\"]*)\"/);
                
                if (radiusx == null) { 
                    radiusx = 0;
                } else {
                    radiusx = toPixels(docRef, radiusx[1], radiusx[2], "x");
                }
                
                var fill = getSVGfill(currentLayer, svgData);
                var stroke = getSVGstroke(currentLayer, svgData, docRef);
                var rectBounds = [x, y, x + width, y + height];
                createRoundRect(docRef, rectBounds, radiusx, fill, stroke, opacity, parentArray[0], currentLayerName);
                break;
                
            case "<circle":
                var r = currentLayer.match(/r=\"(\d*\.?\d*)([^\"]*)\"/);
                
                if ((r == null) || (parseFloat(r) <= 0)) { 
                    break;
                }
                
                r = toPixels(docRef, r[1], r[2]);
                var cx = currentLayer.match(/cx=\"(-?\d*\.?\d*)([^\"]*)\"/);
                
                if (cx == null) { 
                    cx = ["0px", "0", "px"];
                }
                
                cx = toPixels(docRef, cx[1], cx[2], "x");
                var cy = currentLayer.match(/cy=\"(-?\d*\.?\d*)([^\"]*)\"/);
                
                if (cy == null) { 
                    cy = ["0px", "0", "px"];
                }
                
                cy = toPixels(docRef, cy[1], cy[2], "y");
                var fill = getSVGfill(currentLayer, svgData);
                var stroke = getSVGstroke(currentLayer, svgData, docRef);
                var ellipseBounds = [parseFloat(cx - r), parseFloat(cy - r), parseFloat(cx + r), parseFloat(cy + r)];
                createEllipse(docRef, ellipseBounds, fill, stroke, opacity, parentArray[0], currentLayerName);
                break;
                
            case "<ellipse":
                var rx = currentLayer.match(/rx=\"(\d*\.?\d*)([^\"]*)\"/);
                
                if ((rx == null) || (parseFloat(rx) <= 0)) { 
                    break;
                }
                
                rx = toPixels(docRef, rx[1], rx[2]);
                var ry = currentLayer.match(/ry=\"(\d*\.?\d*)([^\"]*)\"/);
                
                if ((ry == null) || (parseFloat(ry) <= 0)) { 
                    break;
                }
                
                ry = toPixels(docRef, ry[1], ry[2]);
                var cx = currentLayer.match(/cx=\"(-?\d*\.?\d*)([^\"]*)\"/);
                
                if (cx == null) { 
                    cx = ["0px", "0", "px"];
                }
                
                cx = toPixels(docRef, cx[1], cx[2], "x");
                var cy = currentLayer.match(/cy=\"(-?\d*\.?\d*)([^\"]*)\"/);
                
                if (cy == null) { 
                    cy = ["0px", "0", "px"];
                }
                
                cy = toPixels(docRef, cy[1], cy[2], "y");
                var fill = getSVGfill(currentLayer, svgData);
                var stroke = getSVGstroke(currentLayer, svgData, docRef);
                var ellipseBounds = [parseFloat(cx - rx), parseFloat(cy - ry), parseFloat(cx + rx), parseFloat(cy + ry)];
                createEllipse(docRef, ellipseBounds, fill, stroke, opacity, parentArray[0], currentLayerName);
                break;
                
            case "<line":
                var fromCoord = [];
                var x1 = currentLayer.match(/x1=\"(-?\d*\.?\d*)([^\"]*)\"/);
                fromCoord[0] = toPixels(docRef, x1[1], x1[2], "x");
                var y1 = currentLayer.match(/y1=\"(-?\d*\.?\d*)([^\"]*)\"/);
                fromCoord[1] = toPixels(docRef, y1[1], y1[2], "x");
                var toCoord = [];
                var x2 = currentLayer.match(/x2=\"(-?\d*\.?\d*)([^\"]*)\"/);
                toCoord[0] = toPixels(docRef, x2[1], x2[2], "x");
                var y2 = currentLayer.match(/y2=\"(-?\d*\.?\d*)([^\"]*)\"/);
                toCoord[1] = toPixels(docRef, y2[1], y2[2], "x");
                var stroke = getSVGstroke(currentLayer, svgData, docRef);
                createLine(docRef, fromCoord, toCoord, stroke, opacity, parentArray[0], currentLayerName);
                break;
                
            case "<polyline":
                var points = currentLayer.match(/\s+points=\"([^\"]*)\"/)[1];
                var pathInfo = createSubPathsFromSVGpath("M" + points, transformString);
                var fill = getSVGfill(currentLayer, svgData);
                var stroke = getSVGstroke(currentLayer, svgData, docRef);
                createShapeLayer(docRef, pathInfo, fill, stroke, opacity, parentArray[0], currentLayerName);
                break;
                
            case "<path":
                var d = currentLayer.match(/\s+d=\"([^\"]*)\"/)[1];
                var pathInfo = createSubPathsFromSVGpath(d, transformString);
                var fill = getSVGfill(currentLayer, svgData);
                var stroke = getSVGstroke(currentLayer, svgData, docRef);
                createShapeLayer(docRef, pathInfo, fill, stroke, opacity, parentArray[0], currentLayerName);
                break;
                
            case "<polygon":
                var points = currentLayer.match(/\s+points=\"([^\"]*)\"/)[1];
                var pathInfo = createSubPathsFromSVGpath("M" + points + "z", transformString);
                var fill = getSVGfill(currentLayer, svgData);
                var stroke = getSVGstroke(currentLayer, svgData, docRef);
                createShapeLayer(docRef, pathInfo, fill, stroke, opacity, parentArray[0], currentLayerName);
                break;
                
            case "<text":
                var x = currentLayer.match(/x=\"(-?\d*\.?\d*)([^\"]*)\"/);
                
                if (x == null) { 
                    x = ["0px", "0", "px"];
                }
                
                x = toPixels(docRef, x[1], x[2], "x");
                var y = currentLayer.match(/y=\"(-?\d*\.?\d*)([^\"]*)\"/);
                
                if (y == null) { 
                    y = ["0px", "0", "px"];
                }
                
                y = toPixels(docRef, y[1], y[2], "y");
                var position = [new UnitValue(x, "px"), new UnitValue(y, "px")];
                var font = currentLayer.match(/font-family=\"([^\"]*)\"/);
                
                if (font != null) { 
                    font = font[1];
                } else {
                    font = "arial";
                }
                
                var fontSize = currentLayer.match(/font-size=\"(\d*\.?\d*)([^\"]*)\"/);
                fontSize = toPixels(docRef, fontSize[1], fontSize[2], "");
                var fontStyle = currentLayer.match(/font-style=\"([^\"]*)\"/);
                
                if (fontStyle != null) { 
                    fontStyle = fontStyle[1];
                } else {
                    fontStyle = "normal";
                }
                
                var fontWeight = currentLayer.match(/font-weight=\"([^\"]*)\"/);
                
                if (fontWeight != null) { 
                    fontWeight = fontWeight[1];
                } else {
                    fontWeight = "normal";
                }
                
                var textAnchor = currentLayer.match(/text-anchor=\"([^\"]*)\"/);
                
                if (textAnchor != null) { 
                    textAnchor = textAnchor[1];
                } else {
                    textAnchor = "start";
                }
                
                var startIndex = svgData.search(currentLayer) + currentLayer.length;
                var endIndex = svgData.indexOf("<", startIndex);
                var textContent = svgData.substring(startIndex, endIndex);
                textContent = textContent.replace(/(\r\n|\n|\r)/gm, "");
                textContent = textContent.replace(/\s+/g, " ");
                textContent = textContent.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
                var fill = getSVGfill(currentLayer, svgData);
                var stroke = getSVGstroke(currentLayer, svgData, docRef);
                createTextLayer(docRef, position, font, fontSize, fontStyle, fontWeight, textAnchor, fill, stroke, opacity, textContent, parentArray[0], currentLayerName);
                break;
                
            case "<g":
                var tempLayer = createEmptyLayer(docRef);
                
                if (currentLayerName == null) { 
                    currentLayerName = "group";
                }
                
                parentArray.unshift(createGroup(docRef, currentLayerName, opacity));
                parentTransform.unshift(transform);
                tempLayer.remove();
                break;
                
            case "</g":
                docRef.activeLayer = parentArray[0];
                applyTransforms(parentTransform[0]);
                parentArray.shift();
                parentTransform.shift();
                docRef.activeLayer = parentArray[0];
                break;
        }
        
        if (((((tag != "<g") && (tag != "</g")) && (tag != "<path")) && (tag != "<polygon")) && (tag != "<polyline")) { 
            applyTransforms(transform);
        }
    }
    
    // // 只有在新建文档时才删除默认背景图层
    // if (!loadInActiveDocument || app.documents.length == 1) {
    //     if (docRef.layers.length > 1) {
    //         docRef.layers[docRef.layers.length - 1].remove();
    //     }
    // }

    // 只有在新建文档时才删除默认背景图层
    if (!loadInActiveDocument) {
        if (docRef.layers.length > 1) {
            docRef.layers[docRef.layers.length - 1].remove();
        }
    }

    if (viewBox != null) { 
        translateActiveLayer(-parseInt(viewBox[0].replace("viewBox=\"", "")), -parseInt(viewBox[1]));
        docRef.activeLayer = svgGroupLayer;
        var newWidth = null;
        var newHeight = null;
        
        if (svgWidth != null) { 
            newWidth = toPixels(docRef, svgWidth[1], svgWidth[2]);
        }
        
        if (svgHeight != null) { 
            newHeight = toPixels(docRef, svgHeight[1], svgHeight[2]);
        }
        
        if (!loadInActiveDocument) {
            if (newWidth != null) { 
                resizeActiveDocUsingPixels(newWidth, null);
            } else {
                if (newHeight != null) { 
                    resizeActiveDocUsingPixels(null, newHeight);
                }
            }
            
            try {
                docRef.resizeCanvas(newWidth, newHeight);
            } catch (e) {
                // Ignore error
            }
        }
    }
    
    try {
        var idcollapseAllGroupsEvent = stringIDToTypeID("collapseAllGroupsEvent");
        var desc3 = new ActionDescriptor();
        executeAction(idcollapseAllGroupsEvent, desc3, DialogModes.NO);
    } catch (e) {
        // Ignore error
    }
    
    try {
        dlgProgress.opacity = 0;
    } catch (e) {
        // Ignore error
    }
    
    dlgProgress.close();
};

var filePath = "{tempFilePath}";
var svgFile = new File(filePath);

if (svgFile.exists) { 
    drawSVG(svgFile);
} else {
    alert("无法找到SVG文件：" + filePath);
}

})();
// ```

// 主要修改：
// 1. **添加了控制变量**：在脚本开头添加了 `loadInActiveDocument` 变量，设置为 `true` 时在活动文档中加载，`false` 时新建文档。
// 2. **修改了文档创建逻辑**：在 `drawSVG` 函数中检查是否要在活动文档中加载，并判断是否有活动文档存在。
// 3. **删除了文件选择功能**：直接使用指定的文件路径。
// 4. **调整了图层删除逻辑**：只有在新建文档时才删除默认背景图层，在活动文档中加载时保持现有图层结构。
// 5. **调整了画布调整逻辑**：在活动文档中加载时不调整画布大小。
// 你可以通过修改脚本开头的 `loadInActiveDocument` 变量来控制加载模式：
// - `loadInActiveDocument = true`：在当前活动文档中加载SVG
// - `loadInActiveDocument = false`：新建文档加载SVG