/*
 * Viewporter v2.0
 * http://github.com/zynga/viewporter
 *
 * Copyright 2011, Zynga Inc.
 * Licensed under the MIT License.
 * https://raw.github.com/zynga/viewporter/master/MIT-LICENSE.txt
 */
var viewporter;
(function() {

	var _viewporter;

	// initialize viewporter object
	viewporter = {

		// options
		forceDetection: false,

		disableLegacyAndroid: true,

		// constants
		ACTIVE: (function() {

			// it's best not do to anything to very weak devices running Android 2.x
			if(viewporter.disableLegacyAndroid && (/android 2/i).test(navigator.userAgent)) {
				return false;
			}

			// iPad's don't allow you to scroll away the UI of the browser
			if((/ipad/i).test(navigator.userAgent)) {
				return false;
			}

			// WebOS has no touch events, but definitely the need for viewport normalization
			if((/webos/i).test(navigator.userAgent)) {
				return true;
			}

			// touch enabled devices
			if('ontouchstart' in window) {
				return true;
			}

			return false;

		}),

		READY: false,

		// methods
		isLandscape: function() {
			return window.orientation === 90 || window.orientation === -90;
		},

		ready: function(callback) {
			window.addEventListener('viewportready', callback, false);
		},
		
		change: function(callback) {
			window.addEventListener('viewportchange', callback, false);
		},

		refresh: function(){
			if (_viewporter) {
				_viewporter.prepareVisualViewport();
			}
		},

		preventPageScroll: function() {

			// prevent page scroll if `preventPageScroll` option was set to `true`
			document.body.addEventListener('touchmove', function(event) {
				event.preventDefault();
			}, false);

			// reset page scroll if `preventPageScroll` option was set to `true`
			// this is used after showing the address bar on iOS
			document.body.addEventListener("touchstart", function() {
				_viewporter.prepareVisualViewport();
			}, false);

		}

	};

	// execute the ACTIVE flag
	viewporter.ACTIVE = viewporter.ACTIVE();

	// if we are on Desktop, no need to go further
	if (!viewporter.ACTIVE) {
		return;
	}

	// create private constructor with prototype..just looks cooler
	var _Viewporter = function() {

		var that = this;

		// Scroll away the header, but not in Chrome
		this.IS_ANDROID = /Android/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

		var _onReady = function() {

			// scroll the shit away and fix the viewport!
			that.prepareVisualViewport();

			// listen for orientation change
			var cachedOrientation = window.orientation;
			window.addEventListener('orientationchange', function() {
				if(window.orientation !== cachedOrientation) {
					that.prepareVisualViewport();
					cachedOrientation = window.orientation;
				}
			}, false);
			
		};


		// listen for document ready if not already loaded
		// then try to prepare the visual viewport and start firing custom events
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', function() {
				_onReady();
			}, false);
		} else {
			_onReady();
		}


	};

	_Viewporter.prototype = {

		getProfile: function() {

			if(viewporter.forceDetection) {
				return null;
			}

			for(var searchTerm in viewporter.profiles) {
				if(new RegExp(searchTerm).test(navigator.userAgent)) {
					return viewporter.profiles[searchTerm];
				}
			}
			return null;
		},

		postProcess: function() {

			// let everyone know we're finally ready
			viewporter.READY = true;

			this.triggerWindowEvent(!this._firstUpdateExecuted ? 'viewportready' : 'viewportchange');
			this._firstUpdateExecuted = true;

		},

		prepareVisualViewport: function() {

			var that = this;

			// if we're running in webapp mode (iOS), there's nothing to scroll away
			if(navigator.standalone) {
				return this.postProcess();
			}

			// maximize the document element's height to be able to scroll away the url bar
			document.documentElement.style.minHeight = '5000px';

			var startHeight = window.innerHeight;
			var deviceProfile = this.getProfile();
			var orientation = viewporter.isLandscape() ? 'landscape' : 'portrait';

			// try scrolling immediately
			window.scrollTo(0, that.IS_ANDROID ? 1 : 0); // Android needs to scroll by at least 1px

			// start the checker loop
			var iterations = 40;
			var check = window.setInterval(function() {

				// retry scrolling
				window.scrollTo(0, that.IS_ANDROID ? 1 : 0); // Android needs to scroll by at least 1px

				function androidProfileCheck() {
					return deviceProfile ? window.innerHeight === deviceProfile[orientation] : false;
				}
				function iosInnerHeightCheck() {
					return window.innerHeight > startHeight;
				}

				iterations--;

				// check iterations first to make sure we never get stuck
				if ( (that.IS_ANDROID ? androidProfileCheck() : iosInnerHeightCheck()) || iterations < 0) {

					// set minimum height of content to new window height
					document.documentElement.style.minHeight = window.innerHeight + 'px';

					// set the right height for the body wrapper to allow bottom positioned elements
					var docViewporter = document.getElementById('viewporter');
					if (docViewporter && docViewporter.style) {
						docViewporter.style.position = 'relative';
						docViewporter.style.height = window.innerHeight + 'px';						
					}


					clearInterval(check);

					// fire events, get ready
					that.postProcess();

				}

			}, 10);

		},

		triggerWindowEvent: function(name) {
			var event = document.createEvent("Event");
			event.initEvent(name, false, false);
			window.dispatchEvent(event);
		}

	};

	// initialize
	_viewporter = new _Viewporter();

})();

viewporter.profiles = {

	// Motorola Xoom
	'MZ601': {
		portrait: 696,
		landscape: 1176
	},

	// Samsung Galaxy S, S2 and Nexus S
	'GT-I9000|GT-I9100|Nexus S': {
		portrait: 508,
		landscape: 295
	},

	// Samsung Galaxy Pad
	'GT-P1000': {
		portrait: 657,
		landscape: 400
	},

	// HTC Desire & HTC Desire HD
	'Desire_A8181|DesireHD_A9191': {
		portrait: 533,
		landscape: 320
	}

};// Inheritance pattern
Function.prototype.inheritsFrom = function(parentClassOrObject) {
	if (parentClassOrObject.constructor == Function) {
		// Normal Inheritance
		this.prototype = new parentClassOrObject;
		this.prototype.constructor = this;
		this.parent = parentClassOrObject.prototype;
	} else {
		// Pure Virtual Inheritance
		this.prototype = parentClassOrObject;
		this.prototype.constructor = this;
		this.parent = parentClassOrObject;
	}
	return this;
};

function popElementFromArray(item, items) {
	for (var i = 0; i < items.length; i++) {
		if (items[i] === item) {
			items.splice(i, 1);
			i--;
			return;
		}
	}
};

function popAllElementsFromArray(items) {
	items.splice(0, items.length);
}

function isInArray(item, items) {
	var count = 0;
	for (var i = 0; i < items.length; i++) {
		if (items[i] === item) {
			count++;
		}
	}
	return count;
}

function getCursorPositionXY(e) {
	var x;
	var y;
	if (isMobile()) {
		x = e.pageX;
		y = e.pageY;
	} else {
		x = e.clientX; // + document.body.scrollLeft +
		// document.documentElement.scrollLeft;
		y = e.clientY; // + document.body.scrollTop +
		// document.documentElement.scrollTop;
	}

	// x = Math.min(x, grid.canvas.width * grid.itemWidth);
	// y = Math.min(y, grid.canvas.height * grid.itemHeight);

	// alert("Cursor position is "+x+":"+y);

	return {
		x : x,
		y : y
	};
};

// Performs crossbrowser transfrom via JQuery
function cssTransform(obj, matrix, rotate, scaleX, scaleY, translate) {

	if (Device.isNative()) {
	    var transform = {
	            "matrix": matrix,
	            "translate": [translate.x, translate.y],
	            "rotate": rotate
	        };
	    obj['css']("transform", transform);
	    return;
	}
	
	var transform = "";

	if (matrix != null) {
		transform += "matrix(" + matrix + ")";
	}

	if (Device.supports3dTransfrom()) {
		if (translate != null) {
			transform += " translate3d(" + translate.x + "px, " + translate.y
					+ "px, 0px)";
		}
		if (rotate != null) {
			transform += " rotate3d(0, 0, 1, " + rotate + "deg)";
		}
		if (scaleX || scaleY) {
			scaleX = scaleX ? scaleX : 1;
			scaleY = scaleY ? scaleY : 1;
			transform += " scale3d(" + scaleX + ", " + scaleY + ", 1)";
		}
	} else {
		if (translate != null) {

			transform += " translateX(" + translate.x + "px)";
			transform += " translateY(" + translate.y + "px)";
		}
		if (rotate != null) {
			transform += " rotate(" + rotate + "deg)";
		}
		if (scaleX != null) {
			transform += " scaleX(" + scaleX + ")";
		}
		if (scaleY != null) {
			transform += " scaleY(" + scaleY + ")";
		}
	}

	obj['css']("-webkit-transform", transform);
	obj['css']("-moz-transform", transform);
	obj['css']("transform", transform);
	obj['css']("-o-transform", transform);
	obj['css']("transform", transform);
	obj['css']("msTransform", transform);
	// Should be fixed in the upcoming JQuery to use instead of 'msTransform'
	// http://bugs.jquery.com/ticket/9572
	// obj['css']("-ms-transform", transform);
}

// Generate unique ID number
var uniqueId = (function() {
	var id = 0; // This is the private persistent value
	// The outer function returns a nested function that has access
	// to the persistent value. It is this nested function we're storing
	// in the variable uniqueID above.
	return function() {
		return id++;
	}; // Return and increment
})(); // Invoke the outer function after defining it.

// Console hack for IE
if (typeof console == "undefined") {
	var console = {
		log : function() {
		},
		warn : function() {
		},
		error : function() {
		}
	};
}

function eLog(message, tag, level) {
	if (!eLog.displayF)
		return;
	if (level && level > eLog.currentLevel)
		return;
	if (tag)
		eLog.displayF(tag + " :  " + message);
	else
		eLog.displayF(message);
};
eLog.displayF = function(msg) {
	try {
		console.log(msg);
	} catch (e) {
	}
};

eLog.currentLevel = 1;

/*
 * Unselectable items
 */

function preventDefaultEventFunction(event) {
	// console.log("preventDefaultEventFunction");
	event.preventDefault();
	return false;
};

function makeUnselectable(obj) {
	obj.addClass("unselectable");
	obj['bind']("touchstart", function(e) {
		e.preventDefault();
		return false;
	});
	obj['bind']("touchmove", function(e) {
		e.preventDefault();
		return false;
	});
	obj['bind']("touchend", function(e) {
		e.preventDefault();
		return false;
	});
};

// either return val is it's a number or calculates
// percentage of parentVal
calcPercentage = function(val, parentVal) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		val = (parseFloat(val.replace("%", "")) * parentVal / 100.0);
	}
	return val;
};

/*
 * 
 * Make divs transparent to clicks
 * http://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements
 * http://www.searchlawrence.com/click-through-a-div-to-underlying-elements.html
 */

function makeClickTransparent(obj) {
	obj['css']("pointer-events", "none");
	// TODO add IE and Opera support
}

var assets = new Array();

function loadMedia(data, oncomplete, onprogress, onerror) {
	var i = 0, l = data.length, current, obj, total = l, j = 0, ext;
	for (; i < l; ++i) {
		current = data[i];
		ext = current.substr(current.lastIndexOf('.') + 1).toLowerCase();

		if (/* Crafty.support.audio && */(ext === "mp3" || ext === "wav"
				|| ext === "ogg" || ext === "mp4")) {
			obj = new Audio(current);
			// Chrome doesn't trigger onload on audio, see
			// http://code.google.com/p/chromium/issues/detail?id=77794
			if (navigator.userAgent.indexOf('Chrome') != -1)
				j++;
		} else if (ext === "jpg" || ext === "jpeg" || ext === "gif"
				|| ext === "png") {
			obj = new Image();
			obj.src = current;
		} else {
			total--;
			continue; // skip if not applicable
		}

		// add to global asset collection
		assets[current] = obj;

		obj.onload = function() {
			++j;

			// if progress callback, give information of assets loaded,
			// total and percent
			if (onprogress) {
				onprogress.call(this, {
					loaded : j,
					total : total,
					percent : (j / total * 100)
				});
			}
			if (j === total) {
				if (oncomplete)
					oncomplete();
			}
		};

		// if there is an error, pass it in the callback (this will be
		// the object that didn't load)
		obj.onerror = function() {
			if (onerror) {
				onerror.call(this, {
					loaded : j,
					total : total,
					percent : (j / total * 100)
				});
			} else {
				j++;
				if (j === total) {
					if (oncomplete)
						oncomplete();
				}
			}
		};
	}
}

function distance(A, B) {
	return Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
}

// Selects first not null value through the list of argument
// and the last one as default
function selectValue() {
	var result;
	for (var i = 0; i < arguments.length - 1; i++) {
		result = arguments[i];
		if (result != null) {
			return result;
		}
	}
	var result = arguments[arguments.length - 1];
	return result;
}

var Recorder = (function() {
	var content = [], refTime = -1, isRecording = false;
	obj = {};
	function recordAction(action, target, params) {
		if (!isRecording) {
			return;
		}
		content.push({
			action : action,
			target : target,
			params : params,
			time : (refTime != -1) ? (Date.now() - refTime) : refTime
		});
		console.log("Recorded Action: ", content[content.length - 1]);
	}
	;

	function clearContent() {
		content = [];
		refTime = -1;
		console.log("Cleared recorder content");
	}
	;

	function setRefTime() {
		refTime = Date.now();
		console.log("Setting ref time to ", new Date(refTime));
	}
	;

	function saveToFile() {
		var string = "";
		console.log("content on saveToFile: ", content);
		for (var i = 0; i < content.length; i++) {
			var temp = "" + content[i].action + ";" + content[i].target + ";"
					+ content[i].time + ";";

			if (content[i].action == "clickedAt") {
				temp = temp + content[i].params.x + "," + content[i].params.y
						+ ";";
			}

			temp = temp + "\n";
			string = string + temp;
		}
		uriContent = "data:application/octet-stream,"
				+ encodeURIComponent(string);
		newWindow = window.open(uriContent, 'neuesDokument');
	}
	;

	function startRecord() {
		clearContent();
		setRefTime();
		isRecording = true;
	}
	;

	function stopRecord() {
		isRecording = false;
		refTime = -1;
		saveToFile();
	}
	;

	obj["recordAction"] = recordAction;
	obj["clearContent"] = clearContent;
	obj["setRefTime"] = setRefTime;
	obj["saveToFile"] = saveToFile;
	obj["startRecord"] = startRecord;
	obj["stopRecord"] = stopRecord;
	obj["getState"] = function() {
		return (function(state) {
			return state;
		})(isRecording);
	};
	return obj;
})();

function RandomNumberGenerator(seed) {
	var keySchedule = [];
	var keySchedule_i = 0;
	var keySchedule_j = 0;

	function init(seed) {
		for (var i = 0; i < 256; i++)
			keySchedule[i] = i;

		var j = 0;
		for (var i = 0; i < 256; i++) {
			j = (j + keySchedule[i] + seed.charCodeAt(i % seed.length)) % 256;

			var t = keySchedule[i];
			keySchedule[i] = keySchedule[j];
			keySchedule[j] = t;
		}
	}
	init(seed);

	function getRandomByte() {
		keySchedule_i = (keySchedule_i + 1) % 256;
		keySchedule_j = (keySchedule_j + keySchedule[keySchedule_i]) % 256;

		var t = keySchedule[keySchedule_i];
		keySchedule[keySchedule_i] = keySchedule[keySchedule_j];
		keySchedule[keySchedule_j] = t;

		return keySchedule[(keySchedule[keySchedule_i] + keySchedule[keySchedule_j]) % 256];
	}

	this.next = function() {
		var number = 0;
		var multiplier = 1;
		for (var i = 0; i < 8; i++) {
			number += getRandomByte() * multiplier;
			multiplier *= 256;
		}
		return number / 18446744073709551616;
	};
};

function cloneObject(obj) {
	if ("object" === typeof obj && obj.length) {
		var ar = [];
		for (var i = 0; i < obj.length; i++) {
			ar[i] = cloneObject(obj[i]);
		}
		return ar;
	}
	if (null == obj || "object" != typeof obj)
		return obj;
	var copy = {};
	for ( var smth in obj) {
		copy[smth] = cloneObject(obj[smth]);
	}
	return copy;
}

function toggleFullScreen() {
	if (!document.fullscreenElement && // alternative standard method
	!document.mozFullScreenElement && !document.webkitFullscreenElement
			&& !document.msFullscreenElement) { // current working methods
		if (document.documentElement.requestFullscreen) {
			document.documentElement.requestFullscreen();
		} else if (document.documentElement.msRequestFullscreen) {
			document.documentElement.msRequestFullscreen();
		} else if (document.documentElement.mozRequestFullScreen) {
			document.documentElement.mozRequestFullScreen();
		} else if (document.documentElement.webkitRequestFullscreen) {
			document.documentElement
					.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		}
	} else {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	}
}

var DEBUG_INTERFACE = {
		active : false,
		log : function() {
		},
		log2 : function() {
		},
		log3 : function() {
		},
		log4 : function() {
		}
};

function turnOnOnScreenDebug() {
	DEBUG_INTERFACE.toppos = 0;
	DEBUG_INTERFACE.div = document.createElement("div");
	DEBUG_INTERFACE.div.style.position = "fixed";
	DEBUG_INTERFACE.div.style.zIndex = 100000000;
	DEBUG_INTERFACE.div.style.fontSize = "12px";
	DEBUG_INTERFACE.div.style.marginTop = 30 + "px";
	DEBUG_INTERFACE.div.style.marginLeft = "50px";
	DEBUG_INTERFACE.div.style.backgroundColor = "rgba(255,255,255,0.5)";
	document.body.appendChild(DEBUG_INTERFACE.div);
	DEBUG_INTERFACE.text1 = "";
	DEBUG_INTERFACE.log = function(message) {
		DEBUG_INTERFACE.text1 += message;
		var div = DEBUG_INTERFACE.div;
		div.innerHTML = "<p>" + DEBUG_INTERFACE.text1 + "</p>";
		if (div.clientHeight > 500) {
			var offset = 30 + 500 - div.clientHeight;
			div.style.marginTop = offset + "px";
		}
	};
	DEBUG_INTERFACE.div2 = document.createElement("div");
	DEBUG_INTERFACE.div2.style.position = "fixed";
	DEBUG_INTERFACE.div2.style.zIndex = 100000000;
	DEBUG_INTERFACE.div2.style.marginTop = 30 + "px";
	DEBUG_INTERFACE.div2.style.marginLeft = "200px";
	DEBUG_INTERFACE.div2.style.backgroundColor = "white";
	document.body.appendChild(DEBUG_INTERFACE.div2);

	DEBUG_INTERFACE.log2 = function(message) {
		var div = DEBUG_INTERFACE.div2;
		div.innerHTML = message;
	};

	DEBUG_INTERFACE.div3 = document.createElement("div");
	DEBUG_INTERFACE.div3.style.position = "fixed";
	DEBUG_INTERFACE.div3.style.zIndex = 100000000;
	DEBUG_INTERFACE.div3.style.fontSize = "12px";
	DEBUG_INTERFACE.div3.style.marginTop = 30 + "px";
	DEBUG_INTERFACE.div3.style.marginLeft = "400px";
	DEBUG_INTERFACE.div3.style.backgroundColor = "rgba(255,255,255,0.5)";
	document.body.appendChild(DEBUG_INTERFACE.div3);
	DEBUG_INTERFACE.text = "";
	DEBUG_INTERFACE.log3 = function(message) {
		var div = DEBUG_INTERFACE.div3;
		DEBUG_INTERFACE.text += message;
		div.innerHTML = "<p>" + DEBUG_INTERFACE.text + "</p>";
		if (div.clientHeight > 500) {
			var offset = 30 + 500 - div.clientHeight;
			div.style.marginTop = offset + "px";
		}
	};

	DEBUG_INTERFACE.div4 = document.createElement("div");
	DEBUG_INTERFACE.div4.style.position = "fixed";
	DEBUG_INTERFACE.div4.style.zIndex = 100000000;
	DEBUG_INTERFACE.div4.style.fontSize = "12px";
	DEBUG_INTERFACE.div4.style.marginTop = 30 + "px";
	DEBUG_INTERFACE.div4.style.marginLeft = "900px";
	DEBUG_INTERFACE.div4.style.backgroundColor = "rgba(255,255,255,0.5)";
	document.body.appendChild(DEBUG_INTERFACE.div4);
	DEBUG_INTERFACE.text3 = "";
	DEBUG_INTERFACE.log4 = function(message) {
		var div = DEBUG_INTERFACE.div4;
		DEBUG_INTERFACE.text3 += message;
		div.innerHTML = "<p>" + DEBUG_INTERFACE.text3 + "</p>";
		if (div.clientHeight > 500) {
			var offset = 30 + 500 - div.clientHeight;
			div.style.marginTop = offset + "px";
		}
	};
	
	DEBUG_INTERFACE.active = true;
	
	return DEBUG_INTERFACE;
}

function isImageOk(img) {
    // During the onload event, IE correctly identifies any images that
    // werenât downloaded as not complete. Others should too. Gecko-based
    // browsers act like NS4 in that they report this incorrectly.
    if (!img.complete) {
        return false;
    }

    // However, they do have two very useful properties: naturalWidth and
    // naturalHeight. These give the true size of the image. If it failed
    // to load, either of these should be zero.

    if (typeof img.naturalWidth !== "undefined" && img.naturalWidth === 0) {
        return false;
    }

    // No other way of checking: assume itâs ok.
    return true;
}


function countProperties(obj) {
    return Object.keys(obj).length;
}

function getRandomInt(min, max)
{
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


// Mega Hack for Android
var mathSin = Math.sin;
Math.sin = function(a){
    if (a === 0) return 0;
    else return mathSin(a);
};
var mathCos = Math.cos;
Math.cos = function(a){
    if (a === 0) return 1;
    else return mathCos(a);
};/**
 * @constructor
 */
function AssertException(message) {
	this.message = message;
}

AssertException.prototype.toString = function() {
	return 'AssertException: ' + this.message;
};

function assert(exp, message) {
	// if (!exp) {
	// 	throw new AssertException(message);
	// }
}var MAX_WIDTH = 1280;
var MAX_HEIGHT = 800;
//
// var MAX_WIDTH = 640;
// var MAX_HEIGHT = 480;

var BASE_WIDTH = 800;
var BASE_HEIGHT = 500;

var ENHANCED_BASE_WIDTH = 1138;
var ENHANCED_BASE_HEIGHT = 640;

var ENHANCED_BASE_MARGIN_WIDTH = 169;
var ENHANCED_BASE_MARGIN_HEIGHT = 70;

var DO_NOT_RESIZE = false;

// Used for Native
var BASE_MARGIN_WIDTH = 0;
var BASE_MARGIN_HEIGHT = 0;
//



var Screen = (function() {
	var screenConsts = {};

	var domForced = false;
	
	// private interface

	// reference to main application class
	var appInstance = null;

	var fieldWidth = BASE_WIDTH;
	var fieldHeight = BASE_HEIGHT;
	var currentFieldHeight, currentFieldWidth;
	var fullWidth, fullHeight, currentFullWidth, currentFullHeight;

	var rotateMsgHeightWidthRatio;
	
	
	//if fixed
	var fixedWidth = null;
	var fixedHeight = null;

	var oldW = null;
	var oldH = null;
	var orientationFlag = null;

	var widthRatio = 1;
	var heightRatio = 1;

	var offsetX = 0;
	var offsetY = 0;

	var isLandscapeDefault = true;
	var isLandscapeFlag = true;
	var secondTimeInRowOrientationCall = null;
	var secondTimeInRowOrientationCallAttempt = 0;

	// coordinates of the whole screen relative to the root scene
	// Defining this object only once so we can use it as reference
	var fullRect = {
		left : 0,
		top : 0,
		right : 0,
		bottom : 0
	};
	
	if (typeof(Native) != "undefined"){
	    fullRect.right = Native.ScreenWidth;
    	fullRect.bottom = Native.ScreenHeight;
	}

	function windowScrollDown() {
		if (typeof(Native) != "undefined") {
			/// TODO Implement
			return;
		}
		setTimeout(function() {
			window['scrollTo'](0, 1);
		}, 10);
		// .hack for android devices
		setTimeout(function() {
			window['scrollTo'](0, 1);
		}, 500);
	}

	var resizeTimeoutHandle = null;

	function actualResize(w, h) {
		if (Screen.isCorrectOrientation()) {

			// recalculate all field parameters
			var sizeChanged = resizeField(w, h);
			
			if (typeof(Native) == "undefined" && sizeChanged) {
				appInstance.resize();
			}

             reseizeBannerInGame();
    		}
	}

	function resizeField(w, h) {
		var windowInnerWidth = selectValue(w, window.innerWidth);
		var windowInnerHeight = selectValue(h, window.innerHeight);
		fullWidth = windowInnerWidth;
		fullHeight = windowInnerHeight;

		fieldWidth = Math.min(MAX_WIDTH, windowInnerWidth);
		fieldHeight = Math.min(MAX_HEIGHT, windowInnerHeight);

		// proportionally scale the screen and center it
		var normalK = BASE_WIDTH / BASE_HEIGHT;
		if (fieldWidth / normalK >= fieldHeight) {
			fieldWidth = Math.ceil(fieldHeight * normalK);
		} else {
			fieldHeight = Math.ceil(fieldWidth / normalK);
		}

		// nothing to do if field size didn't change
		if (currentFieldHeight == fieldHeight
				&& currentFieldWidth == fieldWidth
				&& currentFullWidth == fullWidth
				&& currentFullHeight == fullHeight) {
			return false;
		}

		offsetX = Math.round((windowInnerWidth - fieldWidth) / 2);
		offsetY = Math.round((windowInnerHeight - fieldHeight) / 2);

		currentFullWidth = fullWidth;
		currentFullHeight = fullHeight;

		currentFieldHeight = fieldHeight;
		currentFieldWidth = fieldWidth;

		// alert("actualResize " + currentFullWidth + ", " + currentFullHeight);

		widthRatio = fieldWidth / BASE_WIDTH;
		heightRatio = fieldHeight / BASE_HEIGHT;

		var rootDiv = $('#root');
		if (rootDiv.length > 0) {
			rootDiv['css']("left", offsetX);
			rootDiv['css']("top", offsetY);
		}

		// Size for the rect of maximum size with root div
		// of base size in the center
		fullRect.left = -Screen.offsetX();
		fullRect.top = -Screen.offsetY();
		fullRect.right = -Screen.offsetX() + Screen.fullWidth();
		fullRect.bottom = -Screen.offsetY() + Screen.fullHeight();
		fullRect.width = fullRect.right - fullRect.left;
		fullRect.height = fullRect.bottom - fullRect.top;
		fullRect.offsetX = 0;
		fullRect.offsetY = 0;
		return true;
	}
	
	var resizeRotateMsg = function(w, h) {
		var obj = $("#rotateMsg");
		if (typeof rotateMsgHeightWidthRatio != "number") {
			rotateMsgHeightWidthRatio = obj.height() / obj.width();
		}

		var windowInnerWidth = selectValue(w, window.innerWidth);
		var rotateMsgW = Math.min(MAX_WIDTH, windowInnerWidth);
		var rotateMsgH = rotateMsgW * rotateMsgHeightWidthRatio;
		obj.width(rotateMsgW);
		obj.height(rotateMsgH);
	};
	
	function windowOnResize(event, w, h) {
		// TODO Should it be so?
		if (typeof(Native) != "undefined") {
		    	var BASE_MARGIN_WIDTH = (Native.ScreenWidth - BASE_WIDTH)/2;
		    	var BASE_MARGIN_HEIGHT  = (Native.ScreenHeight - BASE_HEIGHT)/2;
		         
		         ENHANCED_BASE_MARGIN_WIDTH = (ENHANCED_BASE_WIDTH - Native.ScreenWidth)/2;
		         ENHANCED_BASE_MARGIN_HEIGHT = (ENHANCED_BASE_HEIGHT - Native.ScreenHeight)/2;
		         
		    	var rootDiv = $('#root');
		        if (rootDiv.length > 0) {
		            rootDiv['css']("left", ENHANCED_BASE_MARGIN_WIDTH);
		            rootDiv['css']("top", ENHANCED_BASE_MARGIN_HEIGHT);
		        }
		        
		       Native.Screen.SetBaseMargins(BASE_MARGIN_WIDTH, BASE_MARGIN_HEIGHT,
		    		   ENHANCED_BASE_MARGIN_WIDTH, ENHANCED_BASE_MARGIN_HEIGHT);
 			    		
		    		return;
		}
		
		
		if(DO_NOT_RESIZE){
			return;
		}
		if(fixedWidth){
			w = fixedWidth;
		}
		if(fixedHeight){
			h = fixedHeight;
		}
		
//		oldW = null;
//		oldH = null;
		orientationFlag = null;
		
		if (!Screen.isCorrectOrientation()) {
			if (!Loader.loadingMessageShowed()) {
				resizeRotateMsg(w, h);
				$("#rotateMsg")['css']("display", "block");
				$("#rotateMsg")['css']("z-index", 99999999);
				orientationFlag = true;
			}
		} else {
			// absorb nearly simultaneous calls to resize
			if (Screen.orientationChanged() || (oldW != w || oldH != h)) {
				oldW = w;
				oldH = h;
				
				clearTimeout(resizeTimeoutHandle);
				resizeTimeoutHandle = setTimeout(function() {actualResize(w, h); }, 100);
			}
			
			windowScrollDown();
			
			$("#rotateMsg")['css']("z-index", 0);
			$("#rotateMsg")['css']("display", "none");
			
			orientationFlag = false;
		}
			
		// A little hack for S3
		setTimeout(function() {
			if (!Screen.isCorrectOrientation()) {
				if (!Loader.loadingMessageShowed()) {
					resizeRotateMsg(w, h);
					$("#rotateMsg")['css']("display", "block");
					$("#rotateMsg")['css']("z-index", 99999999);
				}
			} else {
				// absorb nearly simultaneous calls to resize
				clearTimeout(resizeTimeoutHandle);
				resizeTimeoutHandle = setTimeout(function() {actualResize(w, h); }, 100);
				windowScrollDown();

				$("#rotateMsg")['css']("z-index", 0);
				$("#rotateMsg")['css']("display", "none");
			}
		}, 500);
		// alert("resize " + Screen.isCorrectOrientation());
		
		return;
	}

	return { // public interface
		init : function(application, isLandscape, params) {
			appInstance = application;

			params = selectValue(params, {});
			

			// inverse default values
			if (isLandscape === false) {
				var buffer = BASE_HEIGHT;
				BASE_HEIGHT = BASE_WIDTH;
				BASE_WIDTH = buffer;

				buffer = ENHANCED_BASE_HEIGHT;
				ENHANCED_BASE_HEIGHT = ENHANCED_BASE_WIDTH;
				ENHANCED_BASE_WIDTH = buffer;

				buffer = ENHANCED_BASE_MARGIN_HEIGHT;
				ENHANCED_BASE_MARGIN_HEIGHT = ENHANCED_BASE_MARGIN_WIDTH;
				ENHANCED_BASE_MARGIN_WIDTH = buffer;

				buffer = MAX_WIDTH;
				MAX_HEIGHT = MAX_WIDTH;
				MAX_WIDTH = buffer;
			}
			// read user provided values if any
			if(isLandscape === "fixed"){
				this.fixedSize = true;
				fixedWidth = params['width'];
				fixedHeight = params['height'];
//				console.log("FIXED");
//				BASE_WIDTH = selectValue(params['MAX_WIDTH'], BASE_WIDTH);
//				console.log("BASE_WIDTH", BASE_WIDTH);
//				BASE_HEIGHT = selectValue(params['MAX_HEIGHT'], BASE_HEIGHT);
//				console.log("BASE_HEIGHT", BASE_HEIGHT);
//				MAX_WIDTH = selectValue(params['MAX_WIDTH'], MAX_WIDTH);
//				MAX_HEIGHT = selectValue(params['MAX_HEIGHT'], MAX_HEIGHT);
//				ENHANCED_BASE_WIDTH = selectValue(params['MAX_WIDTH'],
//						ENHANCED_BASE_WIDTH);
//				ENHANCED_BASE_HEIGHT = selectValue(params['MAX_HEIGHT'],
//						ENHANCED_BASE_HEIGHT);
//				ENHANCED_BASE_MARGIN_WIDTH = 0;
//				ENHANCED_BASE_MARGIN_HEIGHT = 0;
				
				
			}else{
				BASE_WIDTH = selectValue(params['BASE_WIDTH'], BASE_WIDTH);
				BASE_HEIGHT = selectValue(params['BASE_HEIGHT'], BASE_HEIGHT);
				MAX_WIDTH = selectValue(params['MAX_WIDTH'], MAX_WIDTH);
				MAX_HEIGHT = selectValue(params['MAX_HEIGHT'], MAX_HEIGHT);
				ENHANCED_BASE_WIDTH = selectValue(params['ENHANCED_BASE_WIDTH'],
						ENHANCED_BASE_WIDTH);
				ENHANCED_BASE_HEIGHT = selectValue(params['ENHANCED_BASE_HEIGHT'],
						ENHANCED_BASE_HEIGHT);
				ENHANCED_BASE_MARGIN_WIDTH = selectValue(
						params['ENHANCED_BASE_MARGIN_WIDTH'],
						ENHANCED_BASE_MARGIN_WIDTH);
				ENHANCED_BASE_MARGIN_HEIGHT = selectValue(
						params['ENHANCED_BASE_MARGIN_HEIGHT'],
						ENHANCED_BASE_MARGIN_HEIGHT);
			}
			

			screenConsts = {
				"BASE_WIDTH" : BASE_WIDTH,
				"BASE_HEIGHT" : BASE_HEIGHT,
				"ENHANCED_BASE_WIDTH" : ENHANCED_BASE_WIDTH,
				"ENHANCED_BASE_HEIGHT" : ENHANCED_BASE_HEIGHT,
				"ENHANCED_BASE_MARGIN_WIDTH" : ENHANCED_BASE_MARGIN_WIDTH,
				"ENHANCED_BASE_MARGIN_HEIGHT" : ENHANCED_BASE_MARGIN_HEIGHT,
				"-ENHANCED_BASE_MARGIN_WIDTH" : -ENHANCED_BASE_MARGIN_WIDTH,
				"-ENHANCED_BASE_MARGIN_HEIGHT" : -ENHANCED_BASE_MARGIN_HEIGHT
			};

			if ("onorientationchange" in window
					&& !params['disableOrientation']) {
				if (isLandscape == false) {
					isLandscapeDefault = false;
					$('head')['append']
							('<link rel="stylesheet" href="css/orientationPortrait.css" type="text/css" />');
				} else {
					isLandscapeDefault = true;
					$('head')['append']
							('<link rel="stylesheet" href="css/orientationLandscape.css" type="text/css" />');
				}
			} else {
				isLandscapeDefault = null;
				$('#rotateMsg').remove();
			}

			disableTouchEvents();

			$(window)['resize'](windowOnResize);

			$(window)['bind']("scrollstart", function(e) {
				windowScrollDown();
			});
			$(window)['bind']("scrollstop", function(e) {
				windowScrollDown();
			});

			$(window)['trigger']("orientationchange");

			// For iPhones we will force hiding address bar
			// cause there's no scroll event executes when user shows bar
			// by pressing on status bar panel
			if (Device.is("iphone") || Device.is("ipod")) {
				setInterval(windowScrollDown, 5000);
			}

			// Zynga's viewport single reference in code
			// orientation locking
			$(window)['bind']('viewportready viewportchange', function() {
				$(window)['trigger']("resize");
				return;
			});

		},

		// some portals (like Spil Games) will require manual resize function
		windowOnResize : function(w, h) {
			console.log("Window resize: " + w+ "; " + h);
			windowOnResize(null, w, h);
		},
		
		setLandscapeDefault : function(landscapeDefault) {
			isLandscapeDefault = landscapeDefault;
		},

		isCorrectOrientation : function() {
			var isPortrait = window.innerWidth / window.innerHeight < 1.1;
			// alert("correct orient " + window.innerWidth + ", "
			// + window.innerHeight + ", " + window.orientation);
			return (isLandscapeDefault == null)
					|| (isLandscapeDefault === !isPortrait);
		},
		orientationChanged : function() {
			if (isLandscapeDefault == null) {
				return true;
			} else {
				return !orientationFlag;
			}
		},
		isLandscape : function() {
			if (typeof(Native) != "undefined") {
				// TODO Implement
				console.log("Screen.isLandscape is not implemented");
				return true;
			}
			return viewporter.isLandscape();
		},
		widthRatio : function() {
			if (this.fixedSize == true)
				return 1;
			return widthRatio;
		},
		heightRatio : function() {
			if (this.fixedSize == true)
				return 1;
			return heightRatio;
		},
		// Size of the working screen field
		fieldWidth : function() {
			return currentFieldWidth;
		},
		fieldHeight : function() {
			return currentFieldHeight;
		},
		// Offset for the 'Root' object
		offsetX : function() {
			return offsetX / widthRatio;
		},
		offsetY : function() {
			return offsetY / heightRatio;
		},
		// Size of the whole window
		fullWidth : function() {
			return currentFullWidth / widthRatio;
		},
		fullHeight : function() {
			return currentFullHeight / heightRatio;
		},
		fullRect : function() {
			return fullRect;
		},
		// Screen size by setup by design
		baseWidth : function() {
			return BASE_WIDTH;
		},
		baseHeight : function() {
			return BASE_HEIGHT;
		},
		// for reading numeric constants from JSON
		macro : function(val) {
			if (typeof val == "string") {
				var preprocessedVal = screenConsts[val];
				return preprocessedVal ? preprocessedVal : val;
			}
			return val;
		},
		// Calculating size real in pixels
		// from logic base pixel size
		calcRealSize : function(width, height) {
			if (typeof (width) == "number") {
				width = Math.round(Screen.widthRatio() * width);
			} else if (width == "FULL_WIDTH") {
				width = currentFullWidth;
			}

			if (typeof (height) == "number") {
				height = Math.round(Screen.heightRatio() * height);
			} else if (height == "FULL_HEIGHT") {
				height = currentFullHeight;
			}

			return {
				x : width,
				y : height
			};
		},
		// Calculating size in logic pixels
		// from real pixel's size
		calcLogicSize : function(width, height) {
			return {
				x : (width / Screen.widthRatio()),
				y : (height / Screen.heightRatio())
			};
		},
		isDOMForced : function() {
			return domForced;
		},
		setDOMForced : function(forceDom) {
			domForced = forceDom;
		}
	};
})();


// Global vars for touch event handling
var touchStartX = 0;
var touchStartY = 0;
var touchEndX = 0;
var touchEndY = 0;

var mobileBrowser = null;
function isMobile() {
	// return Crafty.mobile;

	if (mobileBrowser != null) {
		return mobileBrowser;
	}

	var ua = navigator.userAgent.toLowerCase(), match = /(webkit)[ \/]([\w.]+)/.exec(ua) || /(o)pera(?:.*version)?[ \/]([\w.]+)/.exec(ua) || /(ms)ie ([\w.]+)/.exec(ua)
			|| /(moz)illa(?:.*? rv:([\w.]+))?/.exec(ua) || [], mobile = /iPad|iPod|iPhone|Android|webOS/i.exec(ua);

	// if (mobile)
	// Crafty.mobile = mobile[0];
	mobileBrowser = mobile;

	return mobileBrowser;
}

var disableTouchEvents = function() {
	if (isMobile()) {
		document.body.ontouchmove = function(e) {
			e.preventDefault();
		};
		document.body.ontouchstart = function(e) {
			e.preventDefault();
		};
		document.body.ontouchend = function(e) {
			e.preventDefault();
		};
	}
};

var enableTouchEvents = function(push) {
	if (isMobile()) {
		document.body.ontouchstart = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchStartX = touchEndX = e.touches[0].pageX;
			touchStartY = touchEndY = e.touches[0].pageY;
			// } else {
			// touchStartX = touchEndX = null;
			// touchStartY = touchEndY = null;
			// }
			return false;
		};

		document.body.ontouchmove = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchEndX = e.touches[0].pageX;
			touchEndY = e.touches[0].pageY;
			// }
			//push(e);
			return false;
		};

		document.body.ontouchend = function(e) {
			e.preventDefault();
			if (touchEndX && touchEndY) {
				var e1 = {};
				e1.pageX = touchEndX;
				e1.pageY = touchEndY;
				//push(e1);
			}
			return false;
		};
	}
};
// Last updated September 2011 by Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Simple class for keeping track of the current transformation matrix

// For instance:
//    var t = new Transform();
//    t.rotate(5);
//    var m = t.m;
//    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

// Is equivalent to:
//    ctx.rotate(5);

// But now you can retrieve it :)

// Remember that this does not account for any CSS transforms applied to the canvas

/**
 * @constructor
 */
function Transform() {
  this.m = [1,0,0,1,0,0];
}

Transform.prototype.reset = function() {
  this.m = [1,0,0,1,0,0];
};

Transform.prototype.multiply = function(matrix) {
  var m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
  var m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];

  var m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
  var m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];

  var dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
  var dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];

  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
  this.m[4] = dx;
  this.m[5] = dy;
};

Transform.prototype.invert = function() {
  var d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
  var m0 = this.m[3] * d;
  var m1 = -this.m[1] * d;
  var m2 = -this.m[2] * d;
  var m3 = this.m[0] * d;
  var m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
  var m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
  this.m[0] = m0;
  this.m[1] = m1;
  this.m[2] = m2;
  this.m[3] = m3;
  this.m[4] = m4;
  this.m[5] = m5;
};

Transform.prototype.rotate = function(rad) {
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.rotateDegrees = function(angle) {
  var rad = angle * Math.PI / 180;
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.translate = function(x, y) {
  this.m[4] += this.m[0] * x + this.m[2] * y;
  this.m[5] += this.m[1] * x + this.m[3] * y;
};

Transform.prototype.scale = function(sx, sy) {
  this.m[0] *= sx;
  this.m[1] *= sx;
  this.m[2] *= sy;
  this.m[3] *= sy;
};

Transform.prototype.transformPoint = function(px, py) {
  var x = px;
  var y = py;
  px = x * this.m[0] + y * this.m[2] + this.m[4];
  py = x * this.m[1] + y * this.m[3] + this.m[5];
  return [px, py];
};/**
 * Device Properties
 */

var USE_NATIVE_RENDER = true;
var Device = (function() {
    // private interface

    var storagePrefix = "";
    var storageSupported = null;

    var reserveStorage = {};

    var userAgentParsed = null;
    var androidOsVersion = null;
    var isAppleMobileOs = null;
    var isIpod = null;
    var iOS = null;
    var isIeBrowser = null;
    var isWebkitBrowser = null;
    var isAndroidStockBrowser = null;

    var userAgent = null;
    var isSupportsToDataURL;

    // result of a benchmark test
    // currently set as percentage of IPhone 4
    var benchmarkTest = 9999;

    var touchStartX, touchStartY, touchEndX, touchEndY;

    var nativeRender = (USE_NATIVE_RENDER && window.NativeRender) ? window.NativeRender
        : null;

    var isNative = typeof(Native) != 'undefined' && Native.Screen ;

    function parseUserAgent() {
        if (userAgentParsed)
            return;
        userAgent = navigator.userAgent.toLowerCase();

        // check apple iOs
        isAppleMobileOs = (/iphone|ipod|ipad/gi).test(navigator.platform);
        isIpod = (/iphone|ipod/gi).test(navigator.platform);

        isWebkitBrowser = userAgent.indexOf("webkit") > -1;

        var nua = navigator.userAgent;
        isAndroidStockBrowser = ((nua.indexOf('Mozilla/5.0') > -1 && nua.indexOf('Android ') > -1 && nua.indexOf('AppleWebKit') > -1) && !(nua.indexOf('Chrome') > -1));
        // check android version
        var androidStr = "android";
        var idx1 = userAgent.indexOf(androidStr);
        if (idx1 > -1) {
            var idx2 = idx1 + androidStr.length;
            var idx3 = userAgent.indexOf(";", idx2);
            var ver = userAgent.substring(idx2, idx3);
            // TODO make correct version parsing
            androidOsVersion = parseFloat(ver);
        }
        userAgentParsed = true;
    }

    function defaultTouchEvents() {
        if (!Device.isTouch())
            return;

        document.ontouchstart = function(e) {
            e.preventDefault();
            touchStartX = touchEndX = e.touches[0].pageX;
            touchStartY = touchEndY = e.touches[0].pageY;
            return false;
        };

        document.ontouchmove = function(e) {
            e.preventDefault();
            touchEndX = e.touches[0].pageX;
            touchEndY = e.touches[0].pageY;
            return false;
        };

        document.ontouchend = function(e) {
            e.preventDefault();
            if (touchEndX && touchEndY) {
                var e1 = {};
                e1.pageX = touchEndX;
                e1.pageY = touchEndY;
            }
            return false;
        };
    }

    //requestAnimationFrame crossbrowser
    window.requestAnimFrame = (function(){
        return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame
    })();
    // test to find out relative speed of device
    // and switch graphics resolution accordingly
    function runBenchmark() {
        var IPHONE_4_TIME = 12;
        var time;
        var startTime = new Date(), iterations = 20000;
        while (iterations--) {
            Math.sqrt(iterations * Math.random());
        }
        // adding 1ms to avoid division by zero
        time = (new Date - startTime) + 1;
        benchmarkTest = 100 * IPHONE_4_TIME / time;
        // alert("test " + benchmarkTest + " time " + time);
    }

    function iOSVersion() {
        return parseFloat(
            ('' + (/CPU.*OS ([0-9_]{1,5})|(CPU like).*AppleWebKit.*Mobile/i.exec(navigator.userAgent) || [0,''])[1])
                .replace('undefined', '3_2').replace('_', '.').replace('_', '')
        ) || false;
    }

    function supportsHtml5Storage() {
        if (storageSupported == null) {
            try {
                storageSupported = 'localStorage' in window
                    && window['localStorage'] !== null;
                // making full test, because while in "private" browsing
                // mode on safari setItem is forbidden
                var storage = window['localStorage'];
                storage.setItem("test", "test");
                storage.getItem("test");
            } catch (e) {
                console.error("Local storage not supported!");
                storageSupported = false;
            }
        }
        return storageSupported;
    }

    return { // public interface
        init : function(params) {
            parseUserAgent();

            /*
             * Add web icons icon114x114.png - with opaque background for iOS
             * devices icon114x114alpha.png - with alpha background for Androids
             *
             */
            params = selectValue(params, {});
            Device.setStoragePrefix(selectValue(params.name, ""));

            var icon114x114 = selectValue(params.icon, "images/icon114x114.png");
            var icon114x114alpha = selectValue(params.iconAlpha,
                "images/icon114x114alpha.png");

            $('head')['append']('<link rel="apple-touch-icon"  href="'
                + icon114x114 + '" />');
            if (Device.isAndroid()) {
                // add web app icon with alpha, otherwise it will
                // overwrite iPad icon
                $('head')['append']
                ('<link rel="apple-touch-icon-precomposed" href="'
                    + icon114x114alpha + '" />');
            }

            defaultTouchEvents();
            runBenchmark();

            /**
             *
             * @return {boolean} support context.GetImageData()
             */
            function supportsToDataURL() {
                if (isAndroidStockBrowser || Device.isNative()) {
                    console.log("supportsToDataURL is not implemented")
                    return false;
                }
                var c = document.createElement("canvas");
                var data = c.toDataURL("image/png");
                return (data.indexOf("data:image/png") == 0);
            }

            isSupportsToDataURL = supportsToDataURL();
        },
        setStoragePrefix : function(val) {
            assert(typeof(val) == "string", "Wrong storage prefix: " + val);
            storagePrefix = val + "_";
        },
        setStorageItem : function(key, val) {
            if (Device.isNative()) {
                if (typeof(val) == "undefined" || typeof(val) == "function")
                    return;
                switch(typeof(val)) {
                    case "string":
                        break;
                    case "number":
                        break;
                    case "object":
                        val = JSON.stringify(val);
                        break;
                };
                Native.Storage.SaveToIsolatedStorage(storagePrefix + key, val);
                return;
            }
            if (supportsHtml5Storage()) {
                var storage = window['localStorage'];
                storage.setItem(storagePrefix + key, val);
            } else {
                reserveStorage[storagePrefix + key] = val;
            }
        },
        getStorageItem : function(key, defaultVal) {
            if (Device.isNative()){
                var answer = Native.Storage.GetFromIsolatedStorage(storagePrefix + key);
                if (answer == null || answer == "" || answer == "null")
                    answer = defaultVal;
                else if (!isNaN(answer))
                    answer *= 1;
                else if (answer == "true")
                    answer = true;
                else if (answer == "false")
                    answer = false;
//	        	else if (answer.indexOf("{") == 0)
//	        		answer = JSON.parse(answer);
                return answer;
            }
            if (supportsHtml5Storage()) {
                var storage = window['localStorage'];
                var val = storage.getItem(storagePrefix + key);
                return (val != null) ? val : defaultVal;
            } else {
                if (reserveStorage[storagePrefix + key])
                    return reserveStorage[storagePrefix + key];
                return defaultVal;
            }
        },

        removeStorageItem : function(key) {
            if (Device.isNative()) {
                ///TODO Implement Storage item removal for native
                return;
            }
            if (supportsHtml5Storage()) {
                var storage = window['localStorage'];
                storage.removeItem(key);
            } else {
                if (reserveStorage[key])
                    delete reserveStorage[key];
            }
        },

        is : function(deviceName) {
            if (Device.isNative()) {
                ///TODO Implement
                return "Not implemented";
            }
            return (userAgent.indexOf(deviceName) > -1);
        },
        isAndroid : function() {
            if (Device.isNative()) {
                ///TODO Implement
                return "Not implemented";
            }
            return androidOsVersion != null;
        },

        androidVersion : function() {
            if (Device.isNative()) {
                ///TODO Implement
                return "Not implemented";
            }
            return androidOsVersion;
        },

        isWebkit : function() {
            if (Device.isNative()) {
                ///TODO Implement
                return "Not implemented";
            }
            return isWebkitBrowser;
        },

        isAppleMobile : function() {
            if (Device.isNative()) {
                ///TODO Implement
                return "Not implemented";
            }
            return isAppleMobileOs;
        },

        isIpodDevice : function() {
            if (Device.isNative()) {
                ///TODO Implement
                return "Not implemented";
            }
            return isIpod;
        },

        isMobile : function() {
            if (Device.isNative()) {
                ///TODO Implement
                return "Not implemented";
            }
            return Device.isTouch();
        },

        isNative : function() {
            return isNative;
        },

        supports3dTransfrom : function() {
            return false;//Modernizr.csstransforms3d;
        },
        nativeRender : function() {
            if (Device.isNative()) {
                ///TODO Not implemented
                return null;
            }
            return nativeRender;
        },

        /*
         * Touch events
         *
         */

        isTouch : function() {
            if (Device.isNative()) {
                ///TODO Not implemented
                return false;
            }
            return 'ontouchstart' in document.documentElement;
        },
        getPositionFromEvent : function(e) {
            if (e['originalEvent'] && e['originalEvent'].touches && e['originalEvent'].touches[0]) {
                // alert(" touch " + e.touches[0].pageX);
                return {
                    x : e['originalEvent']['touches'][0].pageX,
                    y : e['originalEvent']['touches'][0].pageY
                };
            }
            if (e['originalEvent'] && !e['originalEvent'].touches) {
                if (e['originalEvent'].pageX) {
                    return {
                        x : e['originalEvent'].pageX,
                        y : e['originalEvent'].pageY
                    };
                }
            }
            if (e['touches']) {
                return {
                    x : e['touches'][0].pageX,
                    y : e['touches'][0].pageY
                };
            }

            return {
                x : e.pageX,
                y : e.pageY
            };
        },
        getLogicPositionFromEvent : function(e) {
            var pos = Device.getPositionFromEvent(e);
            return {
                x : pos.x / Screen.widthRatio() - Screen.offsetX(),
                y : pos.y / Screen.heightRatio() - Screen.offsetY()
            };
        },
        event : function(eventName) {
            var result;
            switch (eventName) {
                case 'click':
                    result = Device.isTouch() ? 'touchstart' : 'click';
                    break;
                case 'cursorDown':
                    result = Device.isTouch() ? 'touchstart' : 'mousedown';
                    break;
                case 'cursorUp':
                    result = Device.isTouch() ? 'touchend' : 'mouseup';
                    break;
                case 'cursorMove':
                    result = Device.isTouch() ? 'touchmove' : 'mousemove';
                    break;
                case 'cursorOut':
                    result = Device.isTouch() ? 'touchstart' : 'mouseout';
                    break;
                case 'cursorOver':
                    result = Device.isTouch() ? 'touchstart' : 'mouseover';
                    break;
                default:
                    assert(false, "Unrecognizible event " + eventName);
                    result = eventName;
                    break;
            }
            return result;
        },

        touchStartX : function() {
            return touchStartX;
        },
        touchStartY : function() {
            return touchStartY;
        },
        touchEndX : function() {
            return touchEndX;
        },
        touchEndY : function() {
            return touchEndY;
        },
        isWindowsPhone: function () {
            var regExp = new RegExp("Windows Phone", "i");
            return navigator.userAgent.match(regExp);
        },

        // becnmark test for slow devices
        isSlow : function() {
            if (Device.isNative() || Device.isWindowsPhone()) {
//				 alert("I'm native, or windows");
                return false;
            }
//			if (Device.isIpodDevice()) {
////				 alert("I'm ipod");
//				return true;
//			}
            if (Device.isAppleMobile()) {
                if (iOSVersion() < 7) {
//					alert("I'm too old for this... iOS"+iOSVersion());
                    return true;
                } else {
//					alert("I'm so good... iOS"+iOSVersion());
                }
            }
            if ((Device.isAndroid() && Device.androidVersion() < 2.3)
                || benchmarkTest < 80) {
//				 alert("Yes, we are slow = " + benchmarkTest);
                return true;
            } else {
//				 alert("We are fast = " + benchmarkTest);
                return false;
            }
        },

        isSupportsToDataURL: function () {
            return isSupportsToDataURL;
        },

        isAndroidStockBrowser: function() {
            return isAndroidStockBrowser;
        },

        /*
         * Miscellaneous functions
         */

        // shows apple 'Add to home' pop-up
        addToHomeOpenPopup : function() {
            window['addToHomeOpen']();
        }
    };
})();/**
 * Drag'n'Drop utilities
 */

var DragManager = (function() {
	// private interface
	var dragItem = null;

	var dragListeners = new Array();

	function cursorMove(e) {
		// console.log("cursorMove");
		if (dragItem) {
			// console.log("cursorMove dragItem");
			dragItem.dragMove(e);
			// notify listeners
			$['each'](dragListeners, function(id, obj) {
				if (obj.isEventIn(e)) {
					if (!obj.dragItemEntered) {
						// item enters listener zone
						// for the first time
						if (obj.onDragItemEnter) {
							obj.onDragItemEnter(dragItem);
						}
						obj.dragItemEntered = true;
					}
				} else if (obj.dragItemEntered) {
					// item moves out from listener zone
					if (obj.onDragItemOut) {
						obj.onDragItemOut(dragItem);
					}
					obj.dragItemEntered = false;
				}
			});
		}
	}

	function cursorUp() {
		if (dragItem) {

			// notify listeners
			var dragListenerAccepted = null;
			$['each'](dragListeners, function(id, obj) {
				if (obj.dragItemEntered) {
					if (!dragListenerAccepted && obj.onDragItemDrop) {
						if (obj.onDragItemDrop(dragItem)) {
							dragListenerAccepted = obj;
						}
					} else if (obj.onDragItemOut) {
						obj.onDragItemOut(dragItem);
					}
					obj.dragItemEntered = false;
				}
			});
			// console.log("dragCursorUp");
			dragItem.dragEnd(dragListenerAccepted);
			dragItem = null;
		}
	}

	var isInit = false;
	function init() {
		$(document)['bind'](Device.event("cursorUp"), cursorUp);
		$(document)['bind'](Device.event("cursorMove"), cursorMove);
		isInit = true;
	}

	return { // public interface
		//
		addListener : function(listener) {
			assert(listener instanceof GuiDiv,
					"Trying to add illegal drag'n'drop listener. Should be GuiDiv");
			listener.dragItemEntered = false;
			dragListeners.push(listener);
			// sort listeners by priority
			dragListeners.sort(function(l1, l2) {
				var z1 = l1.dragListenerPriority ? l1.dragListenerPriority : 0;
				var z2 = l2.dragListenerPriority ? l2.dragListenerPriority : 0;
				return z2 - z1;
			});
		},
		removeListener : function(listener) {
			popElementFromArray(listener, dragListeners);
		},
		setItem : function(item, e) {
			if (!isInit) {
				init();
			}

			if (dragItem && dragItem.dragEnd) {
				dragItem.dragEnd();
			}
			dragItem = item;

			// immediately update dragListeners
			cursorMove(e);
		},
		getItem : function() {
			return dragItem;
		}
	};
})();
/*
 *  Abstract Factory 
 */
/**
 * @constructor
 */
function AbstractFactory() {
	var objectLibrary = new Object();

	this.addClass = function(clazz, createFunction) {
		var classId;
		if(typeof(clazz) == "function") {
			classId = clazz.prototype.className;
			createFunction = clazz.prototype.createInstance;
		} else {
			classId = clazz;
		}
		
		assert(typeof (classId) == "string", "Invalid classId: " + classId);
		assert(typeof (createFunction) == "function", "Invalid createInstance function for" + " classId " + classId);
		objectLibrary[classId] = createFunction;
	};

	this.createObject = function(classId, args) {
		var createFunc;
		if (!Screen.isDOMForced() && classId == "GuiSprite" && args['canvas'] && objectLibrary["GuiCSprite"])
			createFunc = objectLibrary["GuiCSprite"];
		else
			createFunc = objectLibrary[classId];
		assert(typeof (createFunc) == "function", "classId: " + classId + " was not properly registered.");
		var obj = null;
		if (typeof (args) == "array") {
			obj = createFunc.apply(null, args);
		} else {
			obj = createFunc.call(null, args);
		}
		return obj;
	};

	this.createObjectsFromJson = function(jsonData, preprocessParamsCallback, onCreateCallback) {
		var objects = new Object();
		var that = this;
		$['each'](jsonData, function(name, value) {
			var params = value["params"];
			assert(params, "Params field not specified in '" + name + "'");
			params['name'] = name;
			if (preprocessParamsCallback) {
				preprocessParamsCallback(name, params);
			}
            var obj = that.createObject(value["class"], params);
			objects[name] = obj;
			if (onCreateCallback) {
				onCreateCallback(name, obj, params);
			}
		});

		return objects;
	};
};
//////////////////
/**
 * Resource Manager
 */

var Resources = (function() {
	// private interface
	var assets = new Array();

	var images = new Array();
	var resolutions = new Object();

	// enum of strings of current language
	var strings = new Object();

	var currentResolution = null;
	var defaultResolution = null;

	var loadImage = function(src, callback) {
		var image = new Image();
		image.src = src;
		image.onload = callback;
		return image;
	};

	return { // public interface

		init : function() {
		},

		setResolution : function(resolutionName) {
			assert(resolutions[resolutionName], "Resolution " + resolutionName
					+ " not exists!");
			currentResolution = resolutionName;
		},
		// if there's no picture in current resolution
		// it will be looking in default
		setDefaultResolution : function(resolutionName) {
			assert(resolutions[resolutionName], "Resolution " + resolutionName
					+ " not exists!");
			defaultResolution = resolutionName;
		},

		addResolution : function(resolutionName, imagesFolder, isDefault) {
			assert(!resolutions[resolutionName], "Resolution " + resolutionName
					+ " already exists!");
			resolutions[resolutionName] = {
				folder : imagesFolder,
				images : new Object()
			};

			if (isDefault) {
				Resources.setResolution(resolutionName);
				Resources.setDefaultResolution(resolutionName);
			}
		},

		addImage : function(name, resolution) {
			var resArray;
			if (typeof (resolution) == "string") {
				resArray = new Array();
				resArray(resolution);
			} else if (typeof (resolution) == "array") {
				resArray = resolution;
			} else {
				// adding on available resolutions
				resArray = new Array();
				for ( var i in resolutions) {
					resArray.push(i);
				}
			}

			for ( var i = 0; i < resArray.length; i++) {
				var resolutionName = resArray[i];
				assert(resolutions[resolutionName], "Resolution "
						+ resolutionName + " not exists!");
				resolutions[resolutionName].images[name] = name;
			}
		},
		// returnes string
		getString : function(stringId, rand) {
			if (strings[stringId]) {
			var str = strings[stringId];
				if(strings[stringId] instanceof Array){
					if (rand == false) {
						return strings[stringId];
					}
					var lbl = str[Math.floor(Math.random() * strings[stringId].length)];
					return lbl; 
				}
				return strings[stringId];
			} else {
				// console.error(stringId + " Not Found");
				return stringId;
			}

		},
		// loads json with set language
		setLanguage : function(language, array) {
			if ((array == true) && (typeof language == "object")) {
				strings = language;
			} else {
				var fileName = "resources/localization/" + language + ".json";
				$['getJSON'](fileName, function(data) {
					strings = data;
				});
			}
		},
		// returns filename of an image for current resolution
		getImage : function(name, preload, preloadCallback) {
			var imageFilename = null;
			var image = null;

			// we are not using resolutions
			if (!currentResolution) {
				if (preload) {
					image = loadImage(name, preloadCallback);
				}
				imageFilename = name;
			} else {
				if (resolutions[currentResolution].images[name]) {
					imageFilename = resolutions[currentResolution].folder
							+ resolutions[currentResolution].images[name];
				}

				if (!imageFilename && defaultResolution
						&& defaultResolution != currentResolution
						&& resolutions[defaultResolution].images[name]) {
					imageFilename = resolutions[defaultResolution].folder
							+ resolutions[defaultResolution].images[name];
				}

				// when we are lazy to add all images by the Resource.addImage
				// function
				// we simply add current resolution folder to the requesting
				// name
				// supposing that we have all images for this resolution
				// available
				if (!name || name == 'undefined') {
					return null;
				} 
				
				if (!imageFilename) {
					imageFilename = resolutions[currentResolution].folder
							+ name;
				}

				if (preload) {
					image = loadImage(name, preloadCallback);
				}
			}

			if (preloadCallback && image && image.complete) {
				preloadCallback();
			}
			
			if(assets[name]){
//				console.log("IN ASS", assets[name].complete);
			}

			return imageFilename;
		},

		// return an asset preloaded
		getAsset : function(id) {
			if (assets[id]) {
				return assets[id];
			}
			return false;
		},
		
		getImageAsset : function(id, callback) {
			if (assets[id]) {
				if (callback)
					callback(assets[id]);
				return assets[id];
			}
			var obj = new Image();
			obj.src = Resources.getImage(id);
			obj.onload = function() {
				if (callback)
					callback(obj);
				assets[id] = obj;
			};
			return obj;
		},		
		// return an array of registered images filenames,
		// used for preloading
		getUsedImages : function() {
			var images = new Array();

			// walking through default resolution for all images
			// looking for images in current resolution
			for ( var i in resolutions[defaultResolution].images[i]) {
				if (resolutions[currentResolution].images[i]) {
					images.push(Resources.getImage(i));
				}
			}
			return images;
		},

		// "preloading" font by creating and destroying item with all fonts
		// classes
		preloadFonts : function(fontClasses) {
			for ( var i = 0; i < fontClasses.length; ++i) {
				$("#root")['append']("<div id='fontsPreload" + i
						+ "' + style='opacity:0.1;font-size:1px'>.</div>");
				var testDiv = $("#fontsPreload" + i);
				testDiv['addClass'](fontClasses[i]);
				setTimeout(function() {
					testDiv.remove();
				}, 1000);
			}
		},

		// temporary borrowed from CraftyJS game engine
		// TODO rewrite
		loadMedia : function(data, oncomplete, onprogress, onerror) {
			var i = 0, l = data.length, current, obj, total = l, j = 0, ext;
			for (; i < l; ++i) {
				current = data[i];
				ext = current.substr(current.lastIndexOf('.') + 1)
						.toLowerCase();

				if ((ext === "mp3" || ext === "wav" || ext === "ogg" || ext === "mp4")) {
					obj = new Audio(current);
					// Chrome doesn't trigger onload on audio, see
					// http://code.google.com/p/chromium/issues/detail?id=77794
					if (navigator.userAgent.indexOf('Chrome') != -1)
						j++;
				} else if (ext === "jpg" || ext === "jpeg" || ext === "gif"
						|| ext === "png") {
					obj = new Image();
					obj.src = Resources.getImage(current);
				} else {
					total--;
					continue; // skip if not applicable
				}

				// add to global asset collection
				assets[current] = obj;

				obj.onload = function() {
					++j;
					// if progress callback, give information of assets loaded,
					// total and percent
					if (onprogress) {
						onprogress.call(this, {
							loaded : j,
							total : total,
							percent : (j / total * 100)
						});
					}
					if (j === total) {
						if (oncomplete)
							oncomplete();
					}
				};

				// if there is an error, pass it in the callback (this will be
				// the object that didn't load)
				obj.onerror = function() {
					if (onerror) {
						onerror.call(this, {
							loaded : j,
							total : total,
							percent : (j / total * 100)
						});
					} else {
						j++;
						if (j === total) {
							if (oncomplete)
								oncomplete();
						}
					}
				};
			}
		}
	};
})();
/*WebSound*/
var WebSound = function(context) {
	this.context = context;
	this.volume = 1;
	this.fade = false;
};

WebSound.prototype.play = function(sndInst, callback) {
	var that = this;
	var source = this.context.createBufferSource();
	sndInst.source = source;
	sndInst.source.connect(this.context.destination);
	if(!sndInst.buffer){
		return;
	}
	sndInst.source.buffer = sndInst.buffer;
	sndInst.source.loop = sndInst.loop;
	sndInst.source.gain.value = sndInst.volume;
	sndInst.source.noteGrainOn(0, sndInst.offset, sndInst.duration);
	var buf = sndInst.buffer;
	if (!sndInst.loop) {
		this.playTimeout = setTimeout(function() {
			sndInst.source = that.context.createBufferSource();
			sndInst.source.buffer = buf;
			if (callback) {
				callback();
			}
		}, sndInst.duration * 1000);
	}
};

WebSound.prototype.stop = function(sndInst) {
	if (sndInst && sndInst.source) {
		try{
			sndInst.source.noteOff(0);
		}catch(e){
//			alert("WEB STOPERR:"+e);
		}
	}
};

WebSound.prototype.mute = function(channel) {
	this.muted = true;
	if(channel){
		channel.playing.source.gain.value = 0;
	}else{
		this.volume = 0;
	}
};

WebSound.prototype.unmute = function(channel) {
	this.muted = false;
	if(channel){
		channel.playing.source.gain.value = channel.volume;
	}else{
		this.volume = 1;
	}
};


WebSound.prototype.fadeTo = function(fadeInst) {
	if(this.muted){
		return;
	}
	var fadeStep = 10;
	if(this.fade == fadeInst.sndInst.id){
		return;
	}
	this.fade = fadeInst.sndInst.id;
	var that = this;
	fadeInst.dVol = fadeInst.volume - fadeInst.sndInst.source.gain.value;
	if(fadeInst.dVol == 0){
		return;
	}
	fadeInst.dVol = Math.round((fadeInst.dVol/(fadeInst.time/fadeStep)) * 10000)/10000;
	if (fadeInst.sndInst) {
		this.fading = true;
		var int = setInterval(function(){
			if(Math.abs(fadeInst.sndInst.source.gain.value - fadeInst.volume) >= Math.abs(2 * fadeInst.dVol)){
				fadeInst.sndInst.source.gain.value += fadeInst.dVol;
			}else{
				fadeInst.sndInst.source.gain.value = fadeInst.volume;
				fadeInst.sndInst.source.gain.value = Math.round(fadeInst.sndInst.source.gain.value * 10000)/10000;
				that.fade = false;
				if(fadeInst.callback){
					fadeInst.callback();
				}
				clearInterval(int);
			}
		},fadeStep);
	}
};

WebSound.prototype.loadSprite = function(name, callback) {
	this.loadSound(name, callback);
};

WebSound.prototype.loadSound = function(name, callback) {
	var that = this;
	
	var canPlayMp3, canPlayOgg = null;
	var myAudio = document.createElement('audio');
	if (myAudio.canPlayType) {
		canPlayMp3 = !!myAudio.canPlayType
				&& "" != myAudio.canPlayType('audio/mpeg');
		canPlayOgg = !!myAudio.canPlayType
				&& "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"');
	}
	var ext;
	if(canPlayOgg) {
		ext = ".ogg";
	} else {
		ext = ".mp3";
		//this.soundOffset = this.mp3offset;
	}

	var request = new XMLHttpRequest();
	request.open('GET', name + ext, true);
	request.responseType = 'arraybuffer';
	// Decode asynchronously
	request.onload = function() {
		that.context.decodeAudioData(request.response, function(buffer) {
			var source = that.context.createBufferSource();
			source.buffer = buffer;
			if (callback) {
				callback(buffer);
			}
		}, function() {
			console.error("Unable to load sound:" + name + EXTENTION);
		});
	};
	request.send();
};
var jSound = function() {
	this.chCount = 10;
	this.sprites = null;
	this.i = 0;
};

jSound.prototype.playSprite = function(sndInst, callback) {
	var that = this;

	this.jPlayerInstance['jPlayer']("pause", sndInst.offset);
	this.jPlayerInstance['jPlayer']("play", sndInst.offset);

	audioSpriteEndCallback = function() {

		if (sndInst.loop) {
			that.play(sndInst, callback);
		} else {
			that.stop();
			if (callback) {
				callback();
			}
		}

	};

	this.audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback, sndInst.duration * 1000);

};
jSound.prototype.play = function(sndInst, callback) {
	var that = this;
	var sriteInst = this.sprites[sndInst.spriteName];
	if (!sriteInst) {
		return;
	}
	sriteInst.volume = sndInst.volume;
	sriteInst.play(sndInst, callback);
};

jSound.prototype.fadeTo = function(fadeInst) {
	var fadeStep = 10;
	if (this.fade == fadeInst.sndInst.spriteName) {
		return;
	}

	var spriteInst = this.sprites[fadeInst.sndInst.spriteName];
	if (spriteInst.muted) {
		return;
	}
	this.fade = fadeInst.sndInst.spriteName;
	var that = this;
	fadeInst.dVol = fadeInst.volume - spriteInst.volume;
	if (fadeInst.dVol == 0) {
		return;
	}
	fadeInst.dVol /= fadeInst.time / fadeStep;
	if (fadeInst.sndInst) {
		this.fading = true;
		spriteInst.int = setInterval(function() {
			if (Math.abs(spriteInst.volume - fadeInst.volume) >= Math.abs(fadeInst.dVol)) {
				spriteInst.volume += fadeInst.dVol;
				spriteInst.setVolume(fadeInst.sndInst.id, spriteInst.volume);
			} else {
				spriteInst.volume = fadeInst.volume;
				spriteInst.setVolume(fadeInst.sndInst.id, fadeInst.volume);
				that.fade = false;
				if (fadeInst.callback) {
					fadeInst.callback();
				}
				clearInterval(spriteInst.int);
			}
		}, fadeStep);
	}
};

jSound.prototype.stop = function(sndInst) {
	if (this.sprites == null) {
		return;
	}
	if (sndInst) {
		if (!this.sprites[sndInst.spriteName]) {
			return;
		}
		this.sprites[sndInst.spriteName].stop();
		if(this.sprites[sndInst.spriteName].int){
			clearInterval(this.sprites[sndInst.spriteName].int);				
		}
	} else {
		$['each'](this.sprites, function(index, value) {
			value.audio.stop();
			if(value.int){
				clearInterval(value.int);				
			}
		});
	}
};

jSound.prototype.mute = function(channel) {
	if (this.sprites == null) {
		return;
	}
	if (channel) {
		this.sprites[channel.playing.spriteName].mute();
	} else {
		$['each'](this.sprites, function(index, value) {
			value.mute();
		});
	}
	// this.stop();
};

jSound.prototype.unmute = function(channel) {
	if (this.sprites == null) {
		return;
	}
	if (channel) {
		this.sprites[channel.playing.spriteName].unmute(channel.volume);
	} else {
		$['each'](this.sprites, function(index, value) {
			value.unmute();
		});
	}
};

jSound.prototype.loadSound = function(audioSpriteName, callback, createChannels) {
	if (this.sprites == null) {
		this.sprites = {};
	}
	var that = this;
	if (Device.isAppleMobile()) {
		playOffset = APPLE_OFFSET;
	}
	var name = audioSpriteName;
	var slashInd = audioSpriteName.indexOf("/");// jPlayer's div id must not to
	// include "/"
	if (slashInd >= 0) {
		var ss = audioSpriteName.split('/');
		name = ss[ss.length - 1];
	}

	var jArr = [];
	var n = 1;
	if (createChannels) {
		n = this.chCount;
	}
	for ( var i = 0; i < n; i++) {
		var jPlayer = this.generateJplayer(name + i, audioSpriteName);
		jArr.push(jPlayer);
	}

	this.sprites[audioSpriteName] = this.generateSpriteChannels(jArr);
	if (callback) {
		setTimeout(callback, 1000);
	}
};

jSound.prototype.loadSprite = function(audioSpriteName) {
	var that = this;
	var PATH_TO_JPLAYER_SWF = "js/";
	if (this.sprites == null) {
		this.sprites = {};
	}
	// add jPlayer
	// jQuery['getScript'](PATH_TO_JPLAYER_SWF + 'jquery.jplayer.min.js',
	// function() {
	$("body")['append']("<div id='jPlayerInstanceId" + audioSpriteName
			+ "' style='position:absolute; left:50%; right:50%; width: 0px; height: 0px;'></div>");
	that.sprites[audioSpriteName] = $("#jPlayerInstanceId" + audioSpriteName);
	that.sprites[audioSpriteName]['jPlayer']({
		ready : function() {
			$(this)['jPlayer']("setMedia", {
				oga : "sounds/" + audioSpriteName + ".ogg",
				m4a : "sounds/" + audioSpriteName + ".mp4",
				mp3 : "sounds/" + audioSpriteName + ".mp3"
			});
		},
		supplied : "oga, mp3, m4a",
		solution : "html, flash",
		// solution : "html",//, flash",
		swfPath : PATH_TO_JPLAYER_SWF,

		ended : function() { // The
			// $.jPlayer.event.ended
			// event
			// console.log("Jplayer ended");
		},
		playing : function(event) { // The
			// $.jPlayer.event.ended
			// event
			var timeNow = event['jPlayer'].status.currentTime;
			// console.log("Jplayer playing " +
			// timeNow);
		},
		timeupdate : function(event) { // The
			// $.jPlayer.event.ended
			// event
			var timeNow = event['jPlayer'].status.currentTime;
			// console.log("Jplayer timeupdate "
			// + timeNow);
		}
	});
	// });

};

jSound.prototype.generateJplayer = function(id, audioSpriteName) {
	var PATH_TO_JPLAYER_SWF = "js/";
	var playerDiv = "<div id='" + id + "' style='position:absolute; left:50%; right:50%; width: 0px; height: 0px;'></div>";
	$("body")['append'](playerDiv);
	var jPlayerInstance = $("#" + id);
	// that.sprites[audioSpriteName] = jPlayerInstance;
	// console.log("JPJPJPJPJPJPJJ", jPlayerInstance);
	jPlayerInstance['jPlayer']({
		ready : function() {
			$(this)['jPlayer']("setMedia", {
				oga : audioSpriteName + ".ogg",
				// m4a : audioSpriteName + ".mp4",
				mp3 : audioSpriteName + ".mp3"
			});
		},
		supplied : "oga, mp3, m4a",
		solution : "html, flash",
		preload : "auto", 
		// solution : "html",//, flash",
		swfPath : PATH_TO_JPLAYER_SWF,

		ended : function() { // The
			// $.jPlayer.event.ended
			// event
			// console.log("Jplayer ended");
		},
		playing : function(event) { // The
			// $.jPlayer.event.ended
			// event
			var timeNow = event['jPlayer'].status.currentTime;
			// console.log("Jplayer playing " + timeNow);
		},
		timeupdate : function(event) { // The
			// $.jPlayer.event.ended
			// event
			var timeNow = event['jPlayer'].status.currentTime;
			// console.log("Jplayer timeupdate " + timeNow);
		}
	});
	return jPlayerInstance;
};

jSound.prototype.generateSpriteChannels = function(jArr) {
	var that = this;
	var spriteInst = {
		volume : 1,
		channels : [],
		play : function(sndInst, callback) {
			var ch = this.getFree();
			if (ch) {
				if(this.muted){
					ch.audio['jPlayer']("volume", 0);	
				}else{
					ch.audio['jPlayer']("volume", this.volume);
				}
				ch.audio['jPlayer']("play", sndInst.offset);
				ch.playing = sndInst;
				audioSpriteEndCallback = function() {
					ch.audio['jPlayer']("pause");
					ch.playing = null;
					if (sndInst.loop) {
						that.play(sndInst, callback);
					} else {
						if (callback) {
							callback();
						}
					}
				};

				ch.audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback, sndInst.duration * 1000);
			}
		},
		stop : function() {
			$['each'](this.channels, function(index, value) {
				if (value.playing) {
					 value.audio['jPlayer']("pause");
					 value.playing = null;
					 clearTimeout(value.audioSpriteTimeoutHandler);
				}
			});
		},
		getFree : function() {
			for ( var i = 0; i < this.channels.length; i++) {
				if (!this.channels[i].playing) {
					return this.channels[i];
				}
			}
			console.log("NO FREE CHANNEL");
			return null;
		},
		mute : function() {
			this.muted = true;
			$['each'](this.channels,function(index, value){
//				value.audio['jPlayer']("mute");
				value.audio['jPlayer']("volume", 0);
			});
		},
		unmute : function(vol) {
			this.muted = false;
			$['each'](this.channels,function(index, value){
//				value.audio['jPlayer']("unmute");
				value.audio['jPlayer']("volume", vol);
			});
		},
		setVolume : function(id, vol) {
			$['each'](this.channels, function(index, value) {
				if (value.playing && value.playing.id == id) {
					value.audio['jPlayer']("volume", vol);
				}
			});
		}
	};
	$['each'](jArr, function(index, value) {
		var chInst = {
			audio : value,
			playing : null
		};
		spriteInst.channels.push(chInst);
	});
	return spriteInst;
};/*
 * Standard HTML5 sound 
 */

var htmlSound = function() {
	this.soundOffset = 0;
	this.mp3offset = 0.001;// ;-0.05;
	this.audioSpriteInstance = {};
	this.fade = false;

	this.startTime = 0;
	this.endTime = 0;
};

htmlSound.prototype.play = function(sndInst, callback) {
	var spriteInst = this.audioSpriteInstance[sndInst.spriteName];

	if (!spriteInst || spriteInst.play) {
		return;
	}

	spriteInst.stopCallback = callback;
	spriteInst.audio.volume = sndInst.volume;
	spriteInst.audio.pause();
	if (sndInst.loop) {
		spriteInst.audio.addEventListener('ended', function() {
			this.currentTime = 0;
			this.play();
		}, false);
	}

	spriteInst.startTime = sndInst.offset + this.soundOffset;
	spriteInst.endTime = spriteInst.startTime + sndInst.duration;
	spriteInst.audio.currentTime = spriteInst.startTime;
	spriteInst.play = true;
	spriteInst.audio.play();
};

htmlSound.prototype.stop = function(sndInst) {
	if (this.audioSpriteInstance == null) {
		return;
	}
	if (sndInst) {
		if (!this.audioSpriteInstance[sndInst.spriteName]) {
			return;
		}
		this.audioSpriteInstance[sndInst.spriteName].audio.pause();
		this.audioSpriteInstance[sndInst.spriteName].play = false;
	} else {
		$['each'](this.audioSpriteInstance, function(index, value) {
			value.audio.pause();
			value.play = false;
		});
	}
	// this.audioSpriteInstance.pause();
};

htmlSound.prototype.mute = function(channel) {
	if (this.audioSpriteInstance == null) {
		return;
	}
	if (channel) {
		this.audioSpriteInstance[channel.playing.spriteName].audio.muted = true;
		this.audioSpriteInstance[channel.playing.spriteName].muted = true;
	} else {
		$['each'](this.audioSpriteInstance, function(index, value) {
			value.audio.muted = true;
			value.muted = true;
		});
	}
	// this.stop();
};

htmlSound.prototype.unmute = function(channel) {
	if (this.audioSpriteInstance == null) {
		return;
	}
	if (channel) {
		this.audioSpriteInstance[channel.playing.spriteName].audio.muted = false;
		this.audioSpriteInstance[channel.playing.spriteName].muted = false;
	} else {
		$['each'](this.audioSpriteInstance, function(index, value) {
			value.audio.muted = false;
			value.muted = false;
		});
	}
};

htmlSound.prototype.fadeTo = function(fadeInst) {
	var fadeStep = 10;
	if (this.fade == fadeInst.sndInst.id) {
		return;
	}

	var audio = this.audioSpriteInstance[fadeInst.sndInst.spriteName].audio;
	if (this.audioSpriteInstance[fadeInst.sndInst.spriteName].muted) {
		return;
	}
	this.fade = fadeInst.sndInst.id;
	var that = this;
	fadeInst.dVol = fadeInst.volume - audio.volume;
	if (fadeInst.dVol == 0) {
		return;
	}
	fadeInst.dVol /= fadeInst.time / fadeStep;
	if (fadeInst.sndInst) {
		this.fading = true;
		var int = setInterval(function() {
			if (Math.abs(audio.volume - fadeInst.volume) >= Math.abs(fadeInst.dVol)) {
				audio.volume += fadeInst.dVol;
			} else {
				audio.volume = fadeInst.volume;
				that.fade = false;
				if (fadeInst.callback) {
					fadeInst.callback();
				}
				clearInterval(int);
			}
		}, fadeStep);
	}
};

htmlSound.prototype.loadSound = function(audioSpriteName, callback) {
	var canPlayMp3, canPlayOgg = null;
	var myAudio = document.createElement('audio');
	// myAudio.preload = "auto";
	if (myAudio.canPlayType) {
		canPlayMp3 = !!myAudio.canPlayType && "" != myAudio.canPlayType('audio/mpeg');
		canPlayOgg = !!myAudio.canPlayType && "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"');
	}
	var ext;
	if (canPlayOgg) {
		ext = ".ogg";
	} else {
		ext = ".mp3";
		this.soundOffset = this.mp3offset;
	}

	var audio = new Audio(audioSpriteName + ext);
	audio.preload = "auto";
	var that = this;
	if (callback) {

		audio.addEventListener('abort', function() {
			console.warn(audioSpriteName + " aborted");
		}, true);

		audio.addEventListener('error', function() {
			console.warn(audioSpriteName + " error");
		}, true);

		audio.addEventListener('suspend', function() {
			console.warn(audioSpriteName + " suspend");
		}, true);

		var canplay = function() {
			that.audioSpriteInstance[audioSpriteName] = {
				audio : audio,
				startTime : 0,
				endTime : 0
			};
			callback(that.audioSpriteInstance[audioSpriteName]);
			audio.removeEventListener("canplaythrough", canplay, false);
		};
		audio.addEventListener('canplaythrough', canplay, false);
		audio.addEventListener('timeupdate', function() {
			var spriteInst = that.audioSpriteInstance[audioSpriteName];
			if (spriteInst.audio.currentTime < spriteInst.startTime) {
				spriteInst.audio.currentTime = spriteInst.startTime;
			}
			if (spriteInst.audio.currentTime >= spriteInst.endTime) {
				spriteInst.audio.pause();
				spriteInst.play = false;
				if (spriteInst.stopCallback) {
					spriteInst.stopCallback();
					spriteInst.stopCallback = null;
				}
			}
		}, false);
	} else {
		console.log("NO CALLBACK ON SOUND INIT");
		that.audioSpriteInstance[audioSpriteName] = audio;
	}
};// There few approaches to audio support:
// Audio sprites and separate audio files
// Audio can be played via Flash by JPlayer, HTML5 Audio, Web Audio API
var Sound;
if (typeof(Native) != "undefined")
	Sound = Native.Sound;
else
	Sound = (function() {
		var snd = {
			channels : {
				"default" : {
					playing : null,
					volume : 1
				},
				"background" : {
					playing : null,
					volume : 0.2
				}
			},
			channelCount : 2,
			spriteName : null,
			sprite : {},
			sprites : {},
			forceSprite : false,
			soundBuffers : {},
			getChannel : function(channel) {
				if (!channel || channel == "default") {
					return this.channels["default"];
				} else {
					return this.channels[channel];
				}
			},
			addChannel : function(channel, name) {
				for ( var i = 0; i < this.channels.length; i++) {
					if (this.channels[i] == channel) {
						return;
					}
				}
				if (!channel) {
					return;
				}
	
				this.channels[name] = channel;
			},
			stop : function(channel) {
				var that = this;
				if (channel) {
					var ch = this.getChannel(channel);
					if (ch) {
						this.instance.stop(ch['playing']);
					}
				} else {
					$['each'](this.channels, function(index, value) {
						try{
							if (index != "background" && value && value.playing != null) {
								that.instance.stop(value['playing']);
							}
						}catch(e){
	//						console.err("STOPERR"+e);
						}
					});
				}
			},
			isOn : function() {
				var on = Device.getStorageItem("soundOn", "true") == "true";
				return on;
			},
			mute : function(channel) {
				var that = this;
				var ch = this.getChannel(channel);
				ch.initVol = ch.volume;
				// ch.volume = 0;
				if (ch) {
					if (ch.playing) {
						this.instance.mute(ch);
						ch.muted = true;
					} else {
						// ch.volume = 0;
						ch.muted = true;
					}
				} else {
					$['each'](this.channels, function(index, value) {
						if (index != "background") {
							if (value.playing) {
								that.instance.mute(value);
								value.muted = true;
							} else {
								// value.volume = 0;
								value.muted = true;
							}
						}
					});
				}
			},
			unmute : function(channel) {
				var that = this;
				var ch = this.getChannel(channel);
				ch.initVol = ch.volume;
				// ch.volume = 0;
				if (ch) {
					if (ch.playing) {
						this.instance.unmute(ch);
						ch.muted = false;
					} else {
						// ch.volume = 1;
						ch.muted = false;
					}
				} else {
					$['each'](this.channels, function(index, value) {
						if (index != "background") {
							if (value.playing) {
								that.instance.unmute(value);
								value.muted = false;
							} else {
								// value.volume = 1;
								value.muted = false;
							}
						}
					});
				}
			},
			turnOn : function(isOn) {
				var soundOn = isOn;
				Device.setStorageItem("soundOn", soundOn);
				if (soundOn) {
					this.unmute();
				} else {
					this.mute();
					// this.stop();
				}
			},
			add : function(id, offset, duration, spriteName, priority) {
				// if (this.forceSprite) {
				this.soundBuffers[id] = {
					priority : priority ? priority : 0,
					offset : offset,
					spriteName : spriteName ? spriteName : id,
					duration : duration
				};
				// }
			},
			play : function(id, loop, priority, channel) {
				try {
					var that = this;
					if (!this.soundBuffers[id] || (!this.isOn() && channel != "background")) {
						return;
					}
					var callback = null;
	
					var ch = this.getChannel(channel);
					var sound = this.soundBuffers[id];
					if (typeof loop === 'function') {
						callback = loop;
						loop = false;
					}
					var sndInstance = {
						id : id,
						priority : priority ? priority : sound.priority,
						loop : loop ? true : false,
						offset : sound.offset,
						volume : ch.muted ? 0 : ch.volume,
						duration : sound.duration,
						spriteName : sound.spriteName,
						buffer : this.sprites[sound.spriteName] ? this.sprites[sound.spriteName] : this.sprite
					};
					if (ch.playing != null) {
						var num = this.channelCount++;
						var chName = "channel" + num;
						this.channels[chName] = {
							playing : null,
							volume : 1
						};
						ch = this.channels[chName];
						ch.playing = sndInstance;
						this.instance.play(sndInstance, function() {
							if (callback) {
								callback();
							}
							ch.playing = null;
							that.channels[chName] = null;
							delete that.channels[chName];
						});
	
						// if (ch.playing.priority > sndInstance.priority) {
						// return;
						// } else {
						// this.instance.stop(ch.playing);
						// ch.playing = sndInstance;
						// this.instance.play(sndInstance, function() {
						// if(callback){
						// callback();
						// }
						// ch.playing = null;
						// });
						// }
					} else {
						ch.playing = sndInstance;
						this.instance.play(sndInstance, function() {
							if (callback) {
								callback();
							}
							ch.playing = null;
						});
					}
				}
				catch (e) {console.log(e);}
			},
	        playWithVolume : function(id, volume, priority, loop) {
	            try {
	                var that = this;
	                var callback = null;
	                var ch = this.getChannel("default");
	                ch.volume = volume != null ? volume : 1;
	                var sound = this.soundBuffers[id];
	                if (typeof loop === 'function') {
	                    callback = loop;
	                    loop = false;
	                }
	                var sndInstance = {
	                    id : id,
	                    priority : priority ? priority : sound.priority,
	                    loop : loop ? true : false,
	                    offset : sound.offset,
	                    volume : ch.muted ? 0 : ch.volume,
	                    duration : sound.duration,
	                    spriteName : sound.spriteName,
	                    buffer : this.sprites[sound.spriteName] ? this.sprites[sound.spriteName] : this.sprite
	                };
	                if (ch.playing != null) {
	                    var num = this.channelCount++;
	                    var chName = "channel" + num;
	                    this.channels[chName] = {
	                        playing : null,
	                        volume : 1
	                    };
	                    ch = this.channels[chName];
	                    ch.playing = sndInstance;
	                    this.instance.play(sndInstance, function() {
	                        if (callback) {
	                            callback();
	                        }
	                        ch.playing = null;
	                        that.channels[chName] = null;
	                        delete that.channels[chName];
	                    });
	                } else {
	                    ch.playing = sndInstance;
	                    this.instance.play(sndInstance, function() {
	                        if (callback) {
	                            callback();
	                        }
	                        ch.playing = null;
	                    });
	                }
	            }
	            catch (e) {console.error(e);}
	        },
			init : function(name, forceSprite, callback, createChannels) {
				// createChannels is using only in jSound
				var that = this;
				this.forceSprite = forceSprite ? true : false;
				if (this.forceSprite) {
	
					// console.log("INIT "+name);
					this.instance.loadSound(name, function(buf) {
						that.sprites[name] = buf;
						// set initial mute state
						// Sound.turnOn(Sound.isOn());
						if (callback) {
							callback();
						}
					}, createChannels);
				}
			},
			fadeTo : function(channel, time, volume, callback) {
				var that = this;
				var ch = this.getChannel(channel);
				var playing = ch.playing;
				if (!playing || ch.muted) {
	//				console.log(playing, ch);
					return;
				}
				var fadeInst = {
					channel : channel,
					time : time,
					sndInst : playing,
					volume : volume,
					callback : callback
				};
				this.instance.fadeTo(fadeInst);
			},
			addSprite : function(name) {
				var that = this;
				// this.forceSprite = forceSprite ? true : false;
				// if (this.forceSprite) {
				this.instance.loadSprite(name, function(buf) {
					that.sprites[name] = buf;
				});
				// }
			}
		};
		var context = null;
	
		try {
			context = new webkitAudioContext();
	//		context = null;
		} catch (e) {
			context = null;
			console.log("WEB Audio not supported");
		}
		if (context != null) {
			snd.type = "webAudio";
			snd.instance = new WebSound(context);
		} else {
	//		snd.type = "jSound";
	//		snd.instance = new jSound();
	        snd.type = "htmlSound";
			snd.instance = new htmlSound();
		}
	
		return snd;
	})();/**
 * Entity Factory
 */

var entityFactory = new AbstractFactory();

/**
 * @constructor
 */
entityFactory.createEntitiesFromJson = function(json) {
	this.createObjectsFromJson(json, function(name, params) {
		params['id'] = name;
	}, function(name, obj, params) {
		assert(Account.instance);
		Account.instance.addEntity(obj, name, params);
	});
};
/*
 *  Entity is a main logic item of simulation. 
 *  Entities is a mirroring of server object on client. 
 */

/**
 * @constructor
 */
function Entity() {
};

Entity.prototype.init = function(params) {
	this.params = params;
	this.id = params['id'];

	// Variables values for synchronizing with server
	this.properties = {};
	
	this.sounds = params.sounds;

	if (params['parent']) {
		// find parent among entities in account
		var parent = params['parent'];
		if (typeof params['parent'] == "string") {
			parent = Account.instance.getEntity(params['parent']);
			this.assert(parent, " No parent found with id='" + params['parent']
					+ "' ");
		}
		parent.addChild(this);
	} else {
		console.log(" No parent provided for entity with id='" + this.id + "'");
	}

	var enabled = selectValue(params['enabled'], true);
	this.setEnable(enabled);
	
	// this.readUpdate(params);
	this.timeouts = null;
	this.intervals = null;
	
	this.initChildren(params);
};

Entity.prototype.assert = function(cond, msg) {
	assert(cond, msg + " for entity id='" + this.id + "'");
};

Entity.prototype.log = function(msg) {
	//console.log("Entity id='" + this.id + "', " + msg);
};

Entity.prototype.destroy = function() {
		//TODO WTF is happening?
		if (this.clearTimeouts)
			this.clearTimeouts();
		else
			console.warn("Very suspicious accident! Some shit happened!");
		var child;
		if (this.parent) {
			//TODO WTF is happening?
			if (this.parent.removeChild)
				this.parent.removeChild(this);
			else
				console.warn("Very suspicious accident! Yep, shit happens...");
		}
		if (this.children) {
			for ( var i = 0; i < this.children.length; i++) {
				child = this.children[i];
				// child.destroy();//may be not necessary
				this.removeChild(child);
				Account.instance.removeEntity(child.id);
				i--;
			}
		}
};

Entity.prototype.addChild = function(child) {
	this.children = this.children ? this.children : new Array();
	this.assert(child != this, "Can't be parent for itself");
	this.assert(child.parent == null, "Can't assign as child id='" + child.id
			+ "' since there's parent id='"
			+ (child.parent ? child.parent.id : "") + "' ");
	child.parent = this;
	this.log("Entity.addChild " + child.id);
	this.children.push(child);
};

Entity.prototype.removeChild = function(child) {
	assert(this.children, "no children been assigned");
	popElementFromArray(child, this.children);
};

Entity.prototype.getChild = function(childId) {
	assert(this.children, "no children been assigned");
	var child;
	$.each(this.children, function(id, val) {
		if (val.id == childId)
			child = val;
	});
	assert(child, "No child with id = " + childId + " has been assigned");
	return child;
};

Entity.prototype.initChildren = function(params) {
	if (params && params['children']) {
		Account.instance.readGlobalUpdate(params['children'], this);
	}
};

// scheduled update
Entity.prototype.update = null;

Entity.prototype.isEnabled = function() {
	return this.enabled;
};

Entity.prototype.setEnable = function(isTrue) {
	this.enabled = isTrue;
	if (typeof (this.update) == "function") {
		if (isTrue) {
			Account.instance.addScheduledEntity(this);
		} else {
			Account.instance.removeScheduledEntity(this);
		}
	}
};

// Synchronization with server
Entity.prototype.setDirty = function() {
	var that = this;
	$['each'](arguments, function(id, val) {
		that.dirtyFlags[val] = true;
	});
};

Entity.prototype.clearDirty = function() {
	var that = this;
	$['each'](arguments, function(id, val) {
		that.dirtyFlags[val] = null;
	});
};

Entity.prototype.isDirty = function(name) {
	return this.dirtyFlags[name] == true;
};

Entity.prototype.clearAllDirty = function() {
	this.dirtyFlags = {};
};

Entity.prototype.readUpdate = function(data) {
	var parentId = this.parent ? this.parent['id'] : null;
	// if (data['parent']) {
	if (data['parent'] != parentId) {
		if (this.parent != null) {
			this.parent.removeChild(this);
			this.parent = null;
		}
		if (data['parent']) {
			if (typeof(data['parent']) == "string")
				Account.instance.getEntity(data['parent']).addChild(this);
			else
				data['parent'].addChild(this);
		}
	}
	// }
};

Entity.prototype.readUpdateProperty = function(data, name) {
	this.properties[name] = data[name];
	return data[name];
};

Entity.prototype.writeUpdateProperty = function(data, name, value) {
	if (this.properties[name] != value) {
		data[name] = value;
		this.properties[name] = value;
	}
};

Entity.prototype.writeUpdate = function(globalData, entityData) {
	globalData[this.id] = entityData;
	// entityData['class'] = this.params['class'];
	this.writeUpdateProperty(entityData, "class", this.params['class']);
	// entityData['parent'] = this.params['parent'];
	this.writeUpdateProperty(entityData, "parent", this.params['parent']);
	if (this.children) {
		$['each'](this.children, function(idx, entity) {
			entity.writeUpdate(globalData, new Object());
		});
	}
};

// Timing of entity
Entity.prototype.setInterval = function(func, time) {
	var handle = setInterval(func, time);
	this.intervals = this.intervals ? this.intervals : new Array();
	this.intervals.push(handle);
	return handle;
};

Entity.prototype.setTimeout = function(func, time) {
	var handle = setTimeout(func, time);
	this.timeouts = this.timeouts ? this.timeouts : new Array();
	this.timeouts.push(handle);
	return handle;
};

Entity.prototype.clearTimeout = function(handle) {
	clearTimeout(handle);
	// TODO add removing from array
};

Entity.prototype.clearInterval = function(handle) {
	clearInterval(handle);
	// TODO add removing from array
};

Entity.prototype.clearTimeouts = function() {
	// TODO deal with infinite timeout and interval array increasing
	for ( var i in this.intervals) {
		clearInterval(this.intervals[i]);
	}
	this.intervals = new Array();

	for ( var i in this.timeouts) {
		clearTimeout(this.timeouts[i]);
	}
	this.timeouts = new Array();
};

Entity.prototype.playSound = function(sound) {
	if(!sound || !this.sounds || !this.sounds[sound]) {
		console.log("No sound collection " + sound + " found for entity " + this.id);
		return;
	}
	if (typeof(this.sounds[sound]) == "string")
			Sound.play(this.sounds[sound]);
	else if (this.sounds[sound].length) {
		var soundIdx = getRandomInt(0, this.sounds[sound].length - 1);
		Sound.play(this.sounds[sound][soundIdx]);
	}
};
/**
 * BaseState - abstract class - current state of the game.
 * Loads GUI preset and operate with GUI elements.
 * Preloads any required resources
 */

/**
 * @constructor
 */
function BaseState() {
	BaseState.parent.constructor.call(this);
};

BaseState.inheritsFrom(Entity);

BaseState.prototype.init = function(params) {
	BaseState.parent.init.call(this, params);
	this.guiContainer = new GuiContainer();
	this.guiContainer.init();
	this.guiContainer.resize();
};

BaseState.prototype.destroy = function() {
	BaseState.parent.destroy.call(this);
	this.guiContainer.clear();
};

BaseState.prototype.addGui = function(entity, name) {
	this.guiContainer.addGui(entity, name);
};
BaseState.prototype.removeGui = function(entity) {
	this.guiContainer.removeGui(entity);
};
BaseState.prototype.getGui = function(name) {
	return this.guiContainer.getGui(name);
};

BaseState.prototype.resize = function() {
	this.guiContainer.resize();
};

// Activate will either init object immediately or
// preload required resources and then call init
BaseState.prototype.activate = function(params) {
	this.id = params ? params['id'] : null;
	this.params = params;
	if (this.resources) {
		this.preload();
	} else {
		this.init(this.params);
	}
};

BaseState.prototype.hide = function (setEnable) {
    this.getGui("enhancedScene").hide();
    if (!setEnable) {
        this.guiContainer.resetUpdateInterval();
        this.setEnable(false);
    }
};

BaseState.prototype.show = function (setEnable) {
    if (typeof (setEnable) == "undefined")
        setEnable = true;
    this.getGui("enhancedScene").show();
    if (setEnable) {
        this.guiContainer.setUpdateInterval(GLOBAL_UPDATE_INTERVAL);
        this.setEnable(true);
    }
};

// Preloading of static resources - resources that
// should be upload before the use of the state
BaseState.prototype.preload = function() {
	// Loading JSONs first
	var totalToLoad = 0;
	var that = this;
	if (!this.resources) {
		this.preloadComplete();
		return;
	}
	
	if (this.resources.json) {
		totalToLoad = countProperties(that.resources.json);
		$['each'](this.resources.json, function(key, val) {
			$['getJSON'](key, function(data) {
				that.resources.json[key] = data;
			}).error(function() {
				assert(false, "error reading JSON " + key);
			}).complete(function() {
				totalToLoad--;
				if (totalToLoad <= 0)
					that.jsonPreloadComplete();
				
			});
		});
	} else {
		this.jsonPreloadComplete();
	}
};

BaseState.prototype.jsonPreloadComplete = function() {
	var that = this;
	if (this.resources.media) {
		var startTime = new Date();
		Resources.loadMedia(this.resources.media, function() {
			//console.log("Media loaded for %d ms", (new Date() - startTime));
			that.preloadComplete();
		}, this.preloadingCallback);
	} else {
		this.preloadComplete();
	}
};

BaseState.prototype.preloadComplete = function() {
	// loading complete, make initializing
	this.init(this.params);
};

BaseState.prototype.preloadJson = function(jsonToPreload) {
	if (!this.resources)
		this.resources = new Object();
	if (!this.resources.json)
		this.resources.json = new Object();
	if (typeof jsonToPreload === "string") {
		this.resources.json[jsonToPreload] = null;
	} else if (typeof jsonToPreload === "array") {
		$['each'](this.resources.json, function(key, val) {
			this.resources.json[val] = null;
		});
	} else {
		console.error("Invalid argument for preloadJson: should be array of json urls or single url.");
	}
	//this.jsonPreloadComplete();
};

BaseState.prototype.preloadMedia = function(mediaToPreload, callback) {
	if (!this.resources)
		this.resources = new Object();
	if (!this.resources.media)
		this.resources.media = new Array();
	
	this.preloadingCallback = callback;

	// if (typeof mediaToPreload === "array") {
	if (mediaToPreload instanceof Array) {
		// this.resources.media.concat(mediaToPreload);
		this.resources.media = mediaToPreload;
	} else {
		console.error("Invalid argument for preloadMedia: array of media urls.");
	}
};
/**
 * Account - root entity that is parent to all active entities
 */

var GLOBAL_UPDATE_INTERVAL = 50;
var DOM_MODE = false;

/**
 * @constructor
 */
function Account(parent) {
	Account.parent.constructor.call(this);
};

Account.inheritsFrom(BaseState);

Account.prototype.init = function(params) {
	var that = this;
	params = params ? params : {};
	Account.parent.init.call(this, params);
	// associative array of all active entities
	this.allEntities = new Object();
	// entities that should be update on timely basis
	this.scheduledEntities = new Object();
	this.renderEntities = new Object();

	//GuiSprites that have separate from visual entities updates
	this.staticSprites = {};
	
	// time interval for scheduled synchronization with server
	this.syncWithServerInterval = params['syncWithServerInterval'];
	// adding itself to allEntities for reading updates
	// in automatic mode
	this.id = selectValue(params['id'], "Account01");
	this.globalUpdateInterval = selectValue(params['globalUpdateInterval'],
			GLOBAL_UPDATE_INTERVAL);

	this.addEntity(this);
	// permanent GUI element
	this.backgroundState = new BackgroundState();
	params['backgroundState'] = selectValue(params['backgroundState'], {});
	params['backgroundState']['id'] = selectValue(
			params['backgroundState']['id'], "backgroundState01");
	this.backgroundState.activate(params['backgroundState']);

	// a singleton object
	assert(Account.instance == null,
			"Only one account object at time are allowed");
	Account.instance = this;
	
//	 this.debuggerInstance = turnOnOnScreenDebug();
//	 this.debuggerInstance.fps = {};
//	 this.debuggerInstance.fps.total = 0;
//	 this.debuggerInstance.fps.calls = 0;

	
	
	this.tabActive = true;
//	$(window).blur(function(e) {
//		that.tabActive = false;
//	});
//	$(window).focus(function(e) {
//		that.tabActive = true;
//		that.activateUpdateAndRender();
//
//	});
};

Account.prototype.addEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	assert(this.allEntities[newEntity.id] == null, "Entity with ID '"
			+ newEntity.id + "' already exists");
	this.allEntities[newEntity.id] = newEntity;
};

Account.prototype.getEntity = function(id) {
	return this.allEntities[id];
};

Account.prototype.removeEntity = function(id, dontDestroy) {
	var entity = this.allEntities[id];
	if (entity) {
		if (!dontDestroy) {
			this.removeScheduledEntity(entity);
			this.removeChild(entity);
			entity.destroy();
		}

		delete this.allEntities[id];

	}
};

Account.prototype.removeAllEntities = function(id, dontDestroy) {
	$['each'](this.allEntities, function(id, entity) {
		if (entity !== Account.instance) {
			Account.instance.removeEntity(id, false);
		}
	});
};



/*
 * restart for update and render with reqAnimFrame
 */
Account.prototype.activateUpdateAndRender = function() {
	var that = this;

	this.cancelUpdate = true;

	setTimeout(function() {
		that.prevUpdateTime = Date.now();
		that.cancelUpdate = false;
		that.globalUpdateIntervalHandle = window.requestAnimationFrame(function() {
			that.update(100);
		});
		that.globalRenderFrameHandle = window.requestAnimationFrame(function() {
			that.render();
		});
	}, 500);
};

//Account.prototype.activateUpdateAndRender = function() {
//	var that = this;
//
//	that.debuggerInstance.log(" activateUpdateAndRender");
//	clearTimeout(this.globalUpdateIntervalHandle);
//	clearTimeout(this.globalRenderFrameHandle);
//
//	that.debuggerInstance.log(" clear");
//	window.cancelAnimationFrame(this.globalUpdateIntervalHandle);
//	window.cancelAnimationFrame(this.globalRenderFrameHandle);
//
//	that.debuggerInstance.log(" cancel");
//	setTimeout(function() {
//		that.debuggerInstance.log(" timeout");
//		that.globalUpdateIntervalHandle = window.requestAnimationFrame(function() {
//			that.update(100);
//		});
//		that.globalRenderFrameHandle = window.requestAnimationFrame(function() {
//			that.render();
//		});
//	}, 500);
//};

/*
 * Scheduling for children entities
 */
Account.prototype.addScheduledEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	var that = this;
	var dt = this.globalUpdateInterval;
	// if adding first object to scheduling queue start update interval
	if (!this.globalUpdateIntervalHandle) {
		that.prevUpdateTime = Date.now();
//		this.globalUpdateIntervalHandle = this.setInterval(function() {
//			that.update(dt);
//		}, dt);
		this.globalUpdateIntervalHandle = window.requestAnimationFrame(function() {
			that.update(dt);
		});

	}
	this.scheduledEntities[newEntity.id] = newEntity;
};

Account.prototype.removeScheduledEntity = function(entity) {
	assert(typeof (entity.id) == "string", "Entity ID must be string");
	delete this.scheduledEntities[entity.id];
	// if nothing to schedule anymore stop interval either
	if (!this.globalUpdateIntervalHandle
			&& $['isEmptyObject'](this.scheduledEntities)) {
		this.clearInterval(this.globalUpdateIntervalHandle);
		this.globalUpdateIntervalHandle = null;
	}
};
/*
 * Rendering for children entities
 */
// ÐÑ?Ð»Ð¸ Ð½Ð¸ÑÐµÐ³Ð¾ Ð½ÐµÑ - Ð²Ð¾Ð·Ð²ÑÐ°ÑÐ°ÐµÐ¼ Ð¾Ð±ÑÑÐ½ÑÐ¹ ÑÐ°Ð¹Ð¼ÐµÑ
window.requestAnimationFrame = (function () {
    return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        /**
         *
         * @param {function} callback
         * @param element DOM element
         */
            function (callback, element) {
            window.setTimeout(callback, 1000 / 50);
        };
})();

Account.prototype.addRenderEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	var that = this;
	// if adding first object to rendering queue start update interval
	if (!this.globalRenderFrameHandle) {
		this.lastRenderTime = Date.now();
		this.globalRenderFrameHandle = window.requestAnimationFrame(function() {
			that.render();
		});
	}
	this.renderEntities[newEntity.id] = newEntity;
};

Account.prototype.removeRenderEntity = function(entity) {
	assert(typeof (entity.id) == "string", "Entity ID must be string");
	delete this.renderEntities[entity.id];
	// if nothing to schedule anymore stop interval either
	if (!this.globalRenderFrameHandle
			&& $['isEmptyObject'](this.renderEntities)) {
		this.clearInterval(this.globalRenderFrameHandle);
		this.globalRenderFrameHandle = null;
	}
};

// Regular render update for registered enities
Account.prototype.render = function() {
	var that = this;
//	var dt = Date.now() - this.lastRenderTime;
//	if(dt != 0){
	
	var canvas = null;
		$['each'](this.renderEntities, function(id, entity) {
			if (entity && entity.isVisible && entity.isVisible()) {
				if (!canvas)
					canvas = entity;
				entity.render();
			}
		});
//	}
//	var that = this;
//	this.lastRenderTime = Date.now();
		
	if (!this.cancelUpdate) {
		this.globalRenderFrameHandle = window.requestAnimationFrame(function() {
			that.render();
		}, canvas);
	}
};

// Regular scheduled update for registered enities
Account.prototype.update = function(dt) {
	var that = this;
	var date = Date.now();
	if(date - this.prevUpdateTime >= this.globalUpdateInterval){
		dt = date - this.prevUpdateTime;
//		if (this.debuggerInstance) {
//			this.debuggerInstance.fps.total += dt;
//			this.debuggerInstance.fps.calls++;
//			if (this.debuggerInstance.fps.total > 1000) {
//				this.debuggerInstance.log2(this.debuggerInstance.fps.calls);
//				
//				this.debuggerInstance.fps.total = 0;
//				this.debuggerInstance.fps.calls = 0;
//			}
//		}
//		dt = this.globalUpdateInterval;
		this.prevUpdateTime = Date.now();
		$['each'](this.scheduledEntities, function(id, entity) {
			if (entity && entity.isEnabled()) {
				entity.update(dt);
			}
		});
		
		$['each'](this.staticSprites, function(name, sprite) {
			sprite.update(dt);
		});
		
	}else{
		dt += date - this.prevUpdateTime;
	}
	
	if (!this.cancelUpdate) {
		this.globalUpdateIntervalHandle = window.requestAnimationFrame(function() {
			that.update(dt);
		});
	}
};
Account.prototype.setEnable = function(isTrue) {

};

// called from outside, to notify entities about
// screen resize
Account.prototype.resize = function() {
	if (this.backgroundState) {
		this.backgroundState.resize();
	}
	if (this.children == null)
		return;
	$['each'](this.children, function(idx, entity) {
		if (entity && entity.resize) {
			entity.resize();
		}
	});
};

/*
 * NETWORKING FUNCTIONS dealing with external server /* NETWORKING FUNCTIONS
 * dealing with external server
 */
// Creates/Updates/Destroy all active entities
Account.prototype.readGlobalUpdate = function(data, parent) {
	var that = this;
	$['each'](data, function(id, element) {
		// console.log("readGlobalUpdate key is ", id, element);
		var entity = Account.instance.getEntity(id);
		// entity already exists
		if (entity) {
			// entity should be destroyed with all of its children
			if (element["destroy"]) {
				// console.log("!!!!!Destroy entity '" + entity.id + "'");
				that.removeEntity(id);
				// remove entity from data
				delete data[id];
			} else {
				// updating the entity
				entity.readUpdate(element);
			}
			return;
		} else {
			var parentEntity = typeof(element['parent']) == "object" ? element['parent'] :
				Account.instance.getEntity(element['parent']);
			if (typeof(parent) == "object") {
				parentEntity = parent;
				element['parent'] = parent;
			}
			if (parentEntity) {
				// create new entity
				element["id"] = id;
				entity = entityFactory.createObject(element["class"], element);
				// viking test
				// entity.parent = element.parent;
				that.addEntity(entity);
				// console.log("New entity '" + entity.id + "' of class "
				// + element["class"] + " with parent '"
				// + (entity.parent ? entity.parent.id : "no parent") + "'");
			} else
				console.error("Can`t find parent with id = " + element['parent']+"  for entity = " + id);
		}
	});
};

// Serialize all entities to JSON
Account.prototype.writeGlobalUpdate = function() {
	var data = {};
	this.writeUpdate(data, new Object());
	return data;
};

// read update data from server
Account.prototype.getUpdateFromServer = function(callback) {
	this.server.receiveData(callback);
};

// send data to server
Account.prototype.saveUpdateToServer = function(data, callback) {
	this.server.sendData(data, callback);
};

// perform specific command on server
Account.prototype.commandToServer = function(name, args, callback) {
	var that = this;
	this.server.command(name, args, function(result, data) {
		that.readGlobalUpdate(data);
		callback(result);
	});
};

// make sure client and server are synchronized at the moment
// var acc = 0;
Account.prototype.syncWithServer = function(callback, data, syncInterval) {
	// console.log("startShedule#",acc++);
	// var d = new Date();
	// var g = d.getTime();
	var writeData = this.writeGlobalUpdate();
	if (data) {
		$['extend'](true, writeData, data);
	}
	var that = this;
	this.server.sendData(writeData, function(data) {
		that.readGlobalUpdate(data);
		if (callback) {
			callback();
		}
	});
	syncInterval = selectValue(syncInterval, this.syncWithServerInterval);
	if (syncInterval != null) {
		this.clearTimeout(this.syncWithServerTimeoutId);
		var that = this;
		this.syncWithServerTimeoutId = this.setTimeout(function() {
			that.syncWithServer();
		}, 5000);
		// console.log("sheduleStoped"+(acc-1),((new Date()).getTime() - g));
	}
};
/**
 * VisualEntity - Entity with visual representation
 */

/**
 * @constructor
 */
function VisualEntity() {
	VisualEntity.parent.constructor.call(this);
};

VisualEntity.inheritsFrom(Entity);

VisualEntity.prototype.init = function(params) {
	VisualEntity.parent.init.call(this, params);
	this.x = params['x'];
	this.y = params['y'];
	this.z = params['z'];
	this.width = params['width'];
	this.height = params['height'];
	this.visible = selectValue(params['visible'], true);
	this.visuals = {}; // associative array of all attached visuals
	this.updateTime = GLOBAL_UPDATE_INTERVAL;
	var renderable = selectValue(params['renderable'], false);
	this.setRenderable(renderable);
};

VisualEntity.prototype.createVisual = function() {
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.assert(this.description, "There is no correct description");
};

VisualEntity.prototype.addVisual = function(visualId, visualInfo) {
	var id = (visualId == null) ? 0 : visualId;
	this.assert(this.visuals[id] == null, "Visual id = '" + id
			+ "' is already created.");
	this.visuals[id] = visualInfo;

};


VisualEntity.prototype.isRenderable = function() {
	return this.renderable;
};

VisualEntity.prototype.setRenderable = function(isTrue, justUpdate) {
	this.renderable = isTrue;
	if (typeof (this.render) == "function") {
		if (isTrue) {
			Account.instance.addRenderEntity(this);
		} else {
			Account.instance.removeRenderEntity(this);
		}
	}
	this.justUpdate = justUpdate ? true : false; 
};

VisualEntity.prototype.getVisual = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	return this.visuals[id] ? this.visuals[id].visual : null;
};

VisualEntity.prototype.removeVisual = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	var visual = this.visuals[id].visual;
	this.guiParent.removeGui(visual);
	delete this.visuals[id];
};

VisualEntity.prototype.getVisualInfo = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	return this.visuals[id];
};

VisualEntity.prototype.attachToGui = function(guiParent, clampByParentViewport) {
	if (!this.visual) {
		this.guiParent = guiParent ? guiParent : this.params['guiParent'];
		this.assert(this.guiParent, "No guiParent provided");
		this.createVisual();

		var that = this;
		$['each'](that.visuals, function(id, visualInfo) {
			visualInfo.visual.visualEntity = that;
			that.guiParent.addGui(visualInfo.visual);
			if (visualInfo.visual.clampByParentViewport)
				visualInfo.visual.clampByParentViewport(clampByParentViewport);
		});
	}

};

VisualEntity.prototype.destroy = function(dontRemoveVisual) {
	VisualEntity.parent.destroy.call(this);
	if (this.guiParent && !dontRemoveVisual) {
		var that = this;
		$['each'](this.visuals, function(id, visualInfo) {
			visualInfo.visual.hide();
			that.guiParent.removeGui(visualInfo.visual);
		});
	}
};

VisualEntity.prototype.setZ = function(z) {
	if (typeof z == "number") {
		this.z = z;
	}
	var that = this;
	$['each'](that.visuals, function(id, visualInfo) {
		if (typeof that.z == "number") {
			var visualZ = typeof visualInfo.z == "number" ? visualInfo.z : 0;
			visualInfo.visual.setZ(that.z + visualZ);
		}
	});
};
VisualEntity.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;

	var that = this;
	$['each'](that.visuals, function(id, visualInfo) {
		// dont' move dependent
		if (visualInfo.dependent) {
			return;
		}
		var x = that.x, y = that.y;
		if (typeof visualInfo.offsetX == "number") {
			x -= visualInfo.offsetX;
		}
		if (typeof visualInfo.offsetY == "number") {
			y -= visualInfo.offsetY;
		}

		visualInfo.visual.setPosition(x, y);
	});
};

VisualEntity.prototype.move = function(dx, dy) {
	this.setPosition(this.x + dx, this.y + dy);
};

// Aligns logic position of visualEntity to the one
// of actual visual
VisualEntity.prototype.setPositionToVisual = function(visualId) {
	var visualInfo = this.getVisualInfo(visualId);
	this.x = visualInfo.visual.x + visualInfo.offsetX;
	this.y = visualInfo.visual.y + visualInfo.offsetY;
	this.setPosition(this.x, this.y);
};

VisualEntity.prototype.show = function() {
	this.visible = true;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.show();
	});
};

VisualEntity.prototype.isVisible = function() {
	return this.visible;
};

VisualEntity.prototype.hide = function() {
	this.visible = false;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.hide();
	});
};

VisualEntity.prototype.resize = function() {
	var that = this;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.resize();
	});
};

VisualEntity.prototype.update = function(updateTime, x, y){
	if(x && y){
		this.stpX = x - this.x;
		this.stpY = y - this.y;
	}
};

VisualEntity.prototype.render = function(renderTime){
//	console.log("RENDER", this.newX, this.newY);
//	if(renderTime == 0){
//		return;
//	}
//	if(this.isEnabled()){
//		console.log("enabled");
//	}
//	if(this.isRenderable()){
////		console.log("renderable");
//	}
//	var interval = GLOBAL_UPDATE_INTERVAL;
//	this.updateTime -= renderTime;
//	if(this.updateTime == 0 ){
//		this.update(interval);
//		this.updateTime = interval;
//		return;
//	}
//	if(this.updateTime < 0 ){
//		this.update(interval);
//		this.updateTime = interval + this.updateTime ;
//		return;
//	}
//	if(this.stpX && this.stpY && !this.justUpdate){
//		this.x += renderTime/interval * this.stpX;//(1 - renderTime/interval) * this.x + renderTime/interval * this.newX;
//		this.y += renderTime/interval * this.stpY;//(1 - renderTime/interval) * this.y + renderTime/interval * this.newY;
//		console.log("RENDER", renderTime/interval * this.stpX, renderTime/interval * this.stpY);
//		this.setPosition(this.x, this.y);
//	}
};

VisualEntity.prototype.writeUpdate = function(globalData, entityData) {
	// if(this.id == "Door01"){
	// console.log("FALSE",this.x,this.y);
	// }
	this.writeUpdateProperty(entityData, 'x', this.x);
	this.writeUpdateProperty(entityData, 'y', this.y);
	VisualEntity.parent.writeUpdate.call(this, globalData, entityData);
};

VisualEntity.prototype.readUpdate = function(data) {
	// this.x = this.readUpdateProperty(data, 'x');
	// this.y = this.readUpdateProperty(data, 'y');
	VisualEntity.parent.readUpdate.call(this, data);

};
/**
 * Scene - Container for VisualEntities
 */

function Scene() {
	Scene.parent.constructor.call(this);
};

Scene.inheritsFrom(VisualEntity);
Scene.prototype.className = "Scene";

Scene.prototype.createInstance = function(params) {
	var entity = new Scene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Scene);

Scene.prototype.init = function(params) {
	Scene.parent.init.call(this, params);
};

Scene.prototype.createVisual = function(noChildAttach) {
	var params = this.params;
	var visual = guiFactory.createObject("GuiScene", {
		parent : this.guiParent,
		style : "scene",
		x : params['x'],
		y : params['y'],
		width : params['width'],
		height : params['height'],
		background : params['background']
	});

	var visualInfo = {};
	visualInfo.visual = visual;
	this.addVisual(null, visualInfo);

	var that = this;
	this.children = this.children ? this.children : new Array();
	
	if (!Screen.isDOMForced() && params['canvas']) {
		this.canvas = guiFactory.createObject("GuiCanvas", {
			"parent" : visualInfo.visual,
			"style": "canvasSurface",
			"z": 10,
			"wrap": false
		});
		visualInfo.visual.addGui(this.canvas, "canvasSurface");
	}
	
	if(!noChildAttach){
		$['each'](this.children, function(id, val) {
			that.attachChildVisual(val);
		});
	}
};

Scene.prototype.attachChildVisual = function(child) {
	if (child.attachToGui) {
		child.attachToGui(this.getVisual(), true);
	}
};

Scene.prototype.destroy = function() {
	if (this.canvas)
		Account.instance.removeRenderEntity(this.canvas);
	Scene.parent.destroy.call(this);
};

Scene.prototype.move = function(dx, dy, parallaxDepth) {
	var visual = this.getVisual();
	if (parallaxDepth) {
		$['each'](visual.backgrounds, function(i, back) {
			if (!back)
				return;
			if (i != visual.backgrounds.length - 1) {
				visual.setBackgroundPosition(visual.backgrounds[i].left
						- (dx * (i / parallaxDepth)), visual.backgrounds[i].top
						- (dy * (i / parallaxDepth)), i);
			}
		});
	}

	visual.move(dx, dy);
};

Scene.prototype.getCanvas = function() {
	return this.canvas;
};
/**
 * Item - VisualEntity that can be stored in inventory or placed inside scene.
 */
var ITEM_NAME = "Item";

/**
 * @constructor
 */
function Item() {
	Item.parent.constructor.call(this);
};

Item.inheritsFrom(VisualEntity);
Item.prototype.className = ITEM_NAME;

Item.prototype.createInstance = function(params) {
	var entity = new Item();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Item);

Item.prototype.init = function(params) {
	Item.parent.init.call(this, params);
	this.stashed = params['stashed'];
	if (this.stashed) {
		return;
	} else {
		var guiParent = this.params['guiParent'] ? this.params['guiParent']
				: this.parent.visual;
		if (guiParent) {
			this.attachToGui(guiParent);
		}
	}

	this.z = (this.z != null) ? this.z : 0;
};

Item.prototype.getIcon = function() {
	return this.description['totalImage'];
};

Item.prototype.createVisual = function() {
	this.assert(this.guiParent, "No gui parent provided for creating visuals");
	if(this.description == null){
		this.description = Account.instance.descriptionsData[this.params['description']];
	}
	this.assert(this.description, "There is no correct description");

	var totalImage = Resources.getImage(this.description['totalImage']);

	visual = guiFactory.createObject("GuiSprite", {
		parent : this.guiParent,
		style : "sprite",
		x : this.params['x'],
		y : this.params['y'],
		width : this.description['totalImageWidth'],
		height : this.description['totalImageHeight'],
		totalImage : totalImage,
		totalImageWidth : this.description['totalImageWidth'],
		totalImageHeight : this.description['totalImageHeight'],
		totalTile : this.description['totalTile']
	});
//	for(var i=0;i<=10;i++){
//		for(var j=0;j<=10;j++){
//		x=i*100;
//		y=j*100;
//		visual.jObject['append']("<div class='sprite' style='width : 100px; height : 100px; -webkit-transform: translateX("+x+"px) translateY("+y+"px) scaleX(1) scaleY(1);background-image: url(http://logicking.com/html5/KittyWorldTest/images/introScreen.jpg); background-size : cover'></div>")
//		}
//	}

	var visualInfo = {};
	visualInfo.visual = visual;
	visualInfo.z = this.description['z-index'];
	visualInfo.offsetX = this.description['centerX'] ? calcPercentage(
			this.description['centerX'], this.description['width']) : 0;
	visualInfo.offsetY = this.description['centerY'] ? calcPercentage(
			this.description['centerY'], this.description['height']) : 0;

	this.addVisual(null, visualInfo);
	this.setPosition(this.x, this.y);
	this.setZ(null);
};

Item.prototype.writeUpdate = function(globalData, entityData) {
	Item.parent.writeUpdate.call(this, globalData, entityData);
};
Item.prototype.readUpdate = function(data) {
	// this.params['count'] = data['count'];
	Item.parent.readUpdate.call(this, data);
};
/**
 * SimpleCountdown - VisualEntity with only countdown label.
 */

/**
 * @constructor
 */
function SimpleCountdown() {
	SimpleCountdown.parent.constructor.call(this);
};

SimpleCountdown.inheritsFrom(VisualEntity);
SimpleCountdown.prototype.className = "SimpleCountdown";

SimpleCountdown.prototype.createInstance = function(params) {
	var entity = new SimpleCountdown();
	entity.init(params);
	return entity;
};

entityFactory.addClass(SimpleCountdown);

SimpleCountdown.prototype.init = function(params) {
	this.paused = true;
	SimpleCountdown.parent.init.call(this, params);
	this.label = params['label'];
	//refactor!!!!!
	var go = null;
	var alarmColor = null;
	if(this.description){
		go = this.description['go'];
		alarmColor = this.description['alarmColor'];
	}
	this.goText = selectValue(params['go'], go); 
	
	if(!params['initStart']){
		this.setEnable(false);
	}else{
		this.paused = false;
	}
	this.count = this.params['count'] * 1000;
	this.alarmCount = this.params['alarmCount'] * 1000;
	
	this.alarmColor = selectValue(this.params['alarmColor'], alarmColor);
};

/**
 * Will be called after a cycle will be finished
 * 
 * @param animationCycleEndCallback
 */
SimpleCountdown.prototype.setCycleEndCallback = function(cycleEndCallback) {
	this.cycleEndCallback = cycleEndCallback;
};

SimpleCountdown.prototype.createVisual = function() {
	SimpleCountdown.parent.createVisual.call(this);
	this.description['style'] = (this.description['style'] == null) ? "dialogButtonLabel lcdmono-ultra"
			: this.description['style'];
	
	this.label = this.label ? this.label : guiFactory.createObject("GuiLabel", {
		"parent" : this.guiParent,
		"x" : this.params['x'],
		"y" : this.params['y'],
		"style" : this.description['style'],// "dialogButtonLabel
											// lcdmono-ultra",
		"width" : this.description['width'],
		"height" : this.description['height'],
		"align" : "center",
		"verticalAlign" : "middle",
		"text" : this.params['count'],
		"fontSize" : this.description['fontSize'],
		"color" : this.description['color']
	});
	// this.visual.addGui(this.label);

	var visualInfo = {};
	visualInfo.visual = this.label;
	this.addVisual(null, visualInfo);

	this.paused = false;
};

SimpleCountdown.prototype.pause = function() {
	this.paused = true;
};

SimpleCountdown.prototype.resume = function() {
	this.paused = false;
	this.time = Date.now();
};

SimpleCountdown.prototype.setTime = function(sec) {
	this.count = sec * 1000;
};

SimpleCountdown.prototype.addTime = function(sec) {
	this.count += sec * 1000;
};

SimpleCountdown.prototype.getTimeRemains = function() {
	return this.count;
};

SimpleCountdown.prototype.start = function(){
	this.setEnable(true);
	this.paused = false;
	this.time = Date.now();
};

SimpleCountdown.prototype.updateLabel = function(){
	var secCount = Math.floor(this.count / 1000);
	if(secCount >= 60){
		var minCount = Math.floor(secCount / 60);
		secCount = secCount - (minCount * 60);
		this.label.change(""+minCount+" : "+secCount);
	}else{
		this.label.change(secCount);
	}
};

SimpleCountdown.prototype.update = function(updateTime) {
	if (!this.paused && this.count) {
//		this.count -= updateTime;
		this.count -= Date.now() - this.time;
		this.time = Date.now();
		if (this.count > 0) {
			if (this.alarmCount && (this.count < this.alarmCount + 1000)) {
				this.label.setColor(this.alarmColor);
				this.alarmCount = null;
			} else {
//				this.label.change(Math.floor(this.count / 1000));
				this.updateLabel();
			}
		} else {
			this.label.change(this.goText);
			if (this.cycleEndCallback) {
				this.cycleEndCallback();
				this.cycleEndCallback = null;
			}
		}
	}
};
/**
 * Countdown - VisualEntity with countdown label inside it.
 */

/**
 * @constructor
 */
function Countdown() {
	Countdown.parent.constructor.call(this);
};

Countdown.inheritsFrom(VisualEntity);
Countdown.prototype.className = "Countdown";

Countdown.prototype.createInstance = function(params) {
	var entity = new Countdown();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Countdown);

Countdown.prototype.init = function(params) {
	Countdown.parent.init.call(this, params);
};

/**
 * Will be called after a cycle of animation finished
 * 
 * @param animationCycleEndCallback
 */
Countdown.prototype.setCycleEndCallback = function(cycleEndCallback) {
	this.cycleEndCallback = cycleEndCallback;
};

/**
 * Will be called after the countdown completely finished
 * 
 * @param animationEndCallback
 */
Countdown.prototype.setEndCallback = function(EndCallback) {
	this.EndCallback = EndCallback;
};

Countdown.prototype.createVisual = function() {
	Countdown.parent.createVisual.call(this);
	if (this.description['sprite']) {
		this.sprite = guiFactory
				.createObject(
						"GuiSprite",
						{
							'parent' : this.guiParent,
							'style' : "dialogButton",
							'x' : this.params['x'],
							'y' : this.params['y'],
							'width' : this.description['sprite']['width'],
							'height' : this.description['sprite']['height'],
							'totalImage' : Resources
									.getImage(this.description['sprite']['totalImage']),
							'totalImageWidth' : this.description['sprite']['totalImageWidth'],
							'totalImageHeight' : this.description['sprite']['totalImageHeight'],
							'totalTile' : this.description['sprite']['totalTile'],
							'spriteAnimations' : this.description['sprite']['spriteAnimations']

						});
		var visualInfo = {};
		visualInfo.visual = this.sprite;
		this.addVisual("sprite", visualInfo);
	}
	this.tickSound = this.description['tickSound'] ? this.description['tickSound']
			: "beepShort";
	this.lastSound = this.description['lastSound'] ? this.description['lastSound']
			: "beepShort";
	this.tickDuration = this.description['tickDuration'] ? this.description['tickDuration']
			: 1000;
	this.count = this.params['count'];
	this.duration = this.count * this.tickDuration;
	this.alarmColor = this.description['alarmColor'];
	this.alarmCount = this.params['alarmCount'];
	this.paused = this.description['paused'] ? this.description['paused']
			: false;
	// this.go = this.description['go'];
	if (this.description['label']) {
		this.label = guiFactory
				.createObject(
						"GuiLabel",
						{
							"parent" : this.guiParent,
							"style" : this.description['label']['params']['style'] ? this.description['label']['params']['style']
									: "dialogButtonLabel lcdmono-ultra",
							"width" : this.description['label']['params']['width'],
							"height" : this.description['label']['params']['height'],
							"x" : this.description['label']['params']['x'] ? this.description['label']['params']['x']
									: this.params['x'],
							"y" : this.description['label']['params']['y'] ? this.description['label']['params']['y']
									: this.params['y'],
							"align" : "center",
							"verticalAlign" : "middle",
							"text" : this.count,
							"fontSize" : this.description['label']['params']['fontSize'],
							"color" : this.description['label']['params']['color']
						});
		var labelVisualInfo = {};
		labelVisualInfo.visual = this.label;
		this.addVisual("label", labelVisualInfo);
	}

	var that = this;
	
	var end = false;
	
	var animationEnd = function() {
		if (!that.paused) {
			if (that.count > 1) {
				that.count--;
//				if (that.cycleEndCallback) {
//					that.cycleEndCallback();
//				}
				if (that.label)
					that.label.change(that.count);
				if (that.sprite)
					that.sprite.playAnimation("countdown", that.tickDuration,
							false);
				that.sprite.setAnimationEndCallback(animationEnd);
			} else {
				if (that.sprite)
					that.sprite.playAnimation("empty", that.tickDuration, true);
				if (that.label)
					that.label.change(that.description["go"]);
				if (that.EndCallback) {
					that.EndCallback();
				}
				end = true;
			}
		}
	};
	// Sound.play("beepShort");
	if (!end) {
		if (this.sprite) {
			this.sprite.playAnimation("countdown", 1000, false);
			this.sprite.setAnimationEndCallback(animationEnd);
		}
	}
};

Countdown.prototype.update = function(updateTime) {
	var text = Math.floor(this.duration / 1000) + 1;
	if (!this.paused) {
		if (this.sprite) {
			this.sprite.update(updateTime);
		}
		if (this.label) {
			this.duration -= updateTime;
			if (this.duration > 0) {
				if (this.cycleEndCallback
						&& (text != Math.floor(this.duration / 1000) + 1)) {
					this.cycleEndCallback();
					text = this.label.text;
				}
				if (this.alarmCount
						&& ((this.duration / 1000) < this.alarmCount)) {
					this.label.setColor(this.description['alarmColor']);
					this.alarmCount = null;
				} else {
					if (!this.sprite) {
						this.label.change(Math.floor(this.duration / 1000) + 1);
					}
				}
			} else {
				if (!this.sprite) {
					this.label.change(this.description['go']);
					if (this.EndCallback) {
						this.EndCallback();
						delete this.update;
					}
				}
			}
		}
		if (!this.label && !this.sprite) {
			if (this.duration > 0) {
				this.duration -= updateTime;
				if (this.cycleEndCallback
						&& (text != Math.floor(this.duration / 1000) + 1)) {
					this.cycleEndCallback();
					text = Math.floor(this.duration / 1000) + 1;
				}
			} else {
				if (this.EndCallback) {
					this.EndCallback();
					delete this.update;
				}
			}
		}
	}
};
Countdown.prototype.pause = function() {
	this.paused = true;
};

Countdown.prototype.resume = function() {
	this.paused = false;
};
Countdown.prototype.getTimeRemains = function() {
	return this.count;
};
/**
 * Inventory
 */

/**
 * @constructor
 */
function Inventory() {
	Inventory.parent.constructor.call(this);
};

Inventory.inheritsFrom(Entity);

Inventory.prototype.className = "Inventory";
Inventory.prototype.createInstance = function(params) {
	var entity = new Inventory();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Inventory);

Inventory.prototype.init = function(params) {
	this.children = new Array();
	Inventory.parent.init.call(this, params);
	// this.add();
};
Inventory.prototype.clear = function() {
	this.params.itemList = null;
};
Inventory.prototype.addItem = function(item) {
	if (item instanceof Item) {
		Account.instance.commandToServer("changeParent", [ item['id'],this.id ],
				function(success) {
					if (success) {
						console.log("SUCCESS");
						console.log("ItemADDED");
					} else {
						console.log("FAIL");
					}
				});
	} 
};

Inventory.prototype.readUpdate = function(params) {
	Inventory.parent.readUpdate.call(this, params);
};
Inventory.prototype.writeUpdate = function(globalData, entityData) {
	Inventory.parent.writeUpdate.call(this, globalData, entityData);
};
/**
 * BackgroundState set of useful functions, operating div that permanently exist
 * in game
 */

var LEVEL_FADE_TIME = 500;

/**
 * @constructor
 */
function BackgroundState() {
	BackgroundState.parent.constructor.call(this);
};

BackgroundState.inheritsFrom(BaseState);

BackgroundState.prototype.init = function(params) {
	params = params ? params : {};
	var image = selectValue(
			params['image'],
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=");
	var background;
	if (params['background']) {
		background = params['background'];
		image = null;
	}

	// foreach(params['dialogs'])
	// ['Ok']
	this.dialogs = new Object();
	var that = this;
	if (params['dialogs'])
		$['each'](params['dialogs'], function(index, value) {
			that.dialogs[index] = guiFactory.createObject("GuiMessageBox",
					value['params']);
		});
	BackgroundState.parent.init.call(this, params);
	// an transparent PNG image 1x1 pixel size
	// to prevent clicks
	this.mask = guiFactory.createObject("GuiDiv", {
		parent : "body",
		image : image,
		background : background,
		style : "mask",
		width : "FULL_WIDTH",
		height : "FULL_HEIGHT",
		x : 0,
		y : 0
	});

	if (params["loader"]) {
		if (params["loader"].text) {
			this.loader = guiFactory.createObject("GuiLabel", {
				parent : this.mask,
				image : params['loader'].image,
				text : params["loader"].text,
				style : params["loader"].style?params["loader"].style:"spite",
				fontSize : params["loader"].fontSize?params["loader"].fontSize:40,
				width : params['loader'].width?params['loader'].width:274,
				height : params['loader'].height?params['loader'].height:66,
				x : "50%",
				y : params["loader"].y?params["loader"].y:"65%",
				offsetX : params['loader'].width?(-params['loader'].width/2):-137,
				offsetY : params['loader'].height?(-params['loader'].height/2):-33,
				align : "center"
			});
		} else {
			this.loader = guiFactory.createObject("GuiDiv", {
				parent : this.mask,
				image : params['loader'].image,
				background : {
					image : params['loader'].image
				},
				style : "spite",
				width : params['loader'].width?params['loader'].width:274,
				height : params['loader'].height?params['loader'].height:66,
				x : "50%",
				y : "65%",
				offsetX : params['loader'].width?(-params['loader'].width/2):-137,
				offsetY : params['loader'].height?(-params['loader'].height/2):-33
			});
		}

		this.loader.setClickTransparent(true);
		this.addGui(this.loader);
		this.loader.$()['css']("opacity", 0);
		this.loader.$()['css']("position", "absolute");
//		this.loader.$()['css']("top", "50%");
//		this.loader.$()['css']("left", "50%");
		this.loader.setZ(11001);
		this.loader.hide();
		// this.mask.children.addGui(loader,"loader");
	}
	this.addGui(this.mask);
	this.mask.setClickTransparent(true);
	this.mask.$()['css']("opacity", 0);
	this.mask.setZ(1000);
	this.mask.hide();
};

BackgroundState.prototype.fadeIn = function(fadeTime, color, callback) {
	var that = this;
	console.log("BackgroundState.prototype.fadeIn");
	if (this.loader != null) {
		this.loader.show();
		this.loader.$()['css']("opacity", 0);
		this.loader.$()['stop']();
		this.loader.$()['delay'](0.5 * fadeTime);
		this.loader.fadeTo(1, 0.5 * fadeTime, function() {
		});
	}
	this.mask.show();
	this.mask.$()['stop']();
	this.mask.$()['css']("opacity", 0);
	this.mask.$()['css']("background-color", color);
	this.mask.fadeTo(1, fadeTime, function(){
		that.faded = true;
//		that.mask.show();
		if (callback)
			callback();
	});
};

BackgroundState.prototype.fadeOut = function(fadeTime, callback) {
	var that = this;
	console.log("BackgroundState.prototype.fadeOut");
	if (this.loader != null) {
		this.loader.$()['stop']();
		this.loader.hide();
//		this.loader.fadeTo(0, 0.3 * fadeTime);
	}
	this.mask.fadeTo(0, fadeTime, function() {
		that.faded = false;
		that.mask.hide();
		if (callback)
			callback();
	});
	this.faded = false;
};

BackgroundState.prototype.resize = function() {
	BackgroundState.parent.resize.call(this);
	if (this.loader != null) {
		this.loader.resize();
		this.loader.$()['css']("position", "absolute");
//		this.loader.$()['css']("top", "50%");
//		this.loader.$()['css']("left", "50%");
	}
	$['each'](this.dialogs, function(index, value) {
		value.resize();
	});
};var DEFAULT_B2WORLD_RATIO = 1;

if (typeof(Native) == "undefined") {
	b2Math = Box2D.Common.Math.b2Math;
	b2Vec2 = Box2D.Common.Math.b2Vec2;
	b2BodyDef = Box2D.Dynamics.b2BodyDef;
	b2Body = Box2D.Dynamics.b2Body;
	b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
	b2Fixture = Box2D.Dynamics.b2Fixture;
	b2World = Box2D.Dynamics.b2World;
	b2MassData = Box2D.Collision.Shapes.b2MassData;
	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
	b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
	b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef;
}

// TODO: remove?
function boxPolyVertices(positionX, positionY, extentionX, extentionY) {
    var px = positionX;
    var py = positionY;
    var ex = extentionX;
    var ey = extentionY;
    return [
        {
            x: px,
            y: py
        },
        {
            x: px + ex,
            y: py
        },
        {
            x: px + ex,
            y: py + ey
        },
        {
            x: px,
            y: py + ey
        }
    ];
};

var MathUtils = (function () {
    return {
        toRad: function (angle) {
            return Math.PI / 180. * angle;
        },
        toDeg: function (angle) {
            return 180. / Math.PI * angle;
        }
    };
})();

function calculateAngle(vec1, vec2) {
    var v1 = new b2Vec2(vec1.x, vec1.y);
    var v2 = new b2Vec2(vec2.x, vec2.y);

    var dot = (vec1.x * vec2.x) + (vec1.y * vec2.y);
    var cosA = dot / (v1.Length() * v2.Length());
    return MathUtils.toDeg(Math.acos(cosA));
};

function calculateSignedAngle(vec1, vec2) {
    var v1 = new b2Vec2(vec1.x, vec1.y);
    var v2 = new b2Vec2(vec2.x, vec2.y);

    var f = (vec1.x * vec2.y) + (vec1.y * vec2.x);
    var sinA = f / (v1.Length() * v2.Length());
    return sinA;
};

function DebugCanvas() {
    //setup debug draw
    var canvasElm = document.getElementById("debugCanvas");
    if (!canvasElm) {
        $("#root")
            .append(
            "<canvas id='debugCanvas' style='position :absolute; top: 0px; left: 0px;'></canvas>");
        canvasElm = document.getElementById("debugCanvas");
    }
    canvasElm.width = BASE_WIDTH;
    canvasElm.height = BASE_HEIGHT;
    canvasElm.style.width = canvasElm.width * Screen.widthRatio();
    canvasElm.style.height = canvasElm.height * Screen.heightRatio();

    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(canvasElm.getContext("2d"));
    debugDraw.SetDrawScale(Physics.getB2dToGameRatio());
    debugDraw.SetFillAlpha(0.5);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    Physics.getWorld().SetDebugDraw(debugDraw);
};

var Physics = (function () {
    var world = null;
    var b2dToGameRatio = DEFAULT_B2WORLD_RATIO; // Box2d to Ultimate.js coordinates //TODO: implement
    var worldBorder = null;
    var timeout = null;
    var pause = false;
    var debugMode = true;
    var debugCanvas = null;
    var updateItems = [];
    var bodiesToDestroy = [];
    var contactListener = null;
    var contactProcessor = null;
    var maxSpeed = {
    		linearX: 0,
    		linearY: 0,
    		linear: 0,
    		angular: 0
    };

    function debugDrawing(v) {
        if (v && !debugCanvas) {
            debugCanvas = new DebugCanvas();
        }

        if (!v && debugCanvas) {
            debugCanvas.debugDrawContext
                .clearRect(0, 0, debugCanvas.debugCanvasWidth,
                debugCanvas.debugCanvasHeight);
            debugCanvas = null;
        }
    }

    /**
     *
     * @param {b2Vec2} gravity Default: b2Vec2(0, 10)
     * @param {boolean} sleep default: true;
     * @param {number} ratio Box2d to Ultimate.js coordinates
     */
    function createWorld(gravity, sleep, ratio) {
        if (world != null) {
            return;
        }
        b2dToGameRatio = ratio != null ? ratio : DEFAULT_B2WORLD_RATIO;
        world = new b2World(gravity != null ? gravity : new b2Vec2(0, 10), sleep != null ? sleep : true);
    }

    // TODO: remove?
    function createWorldBorder(params) {
        assert(world);

        var SIDE = ENHANCED_BASE_MARGIN_WIDTH;
        if (!GROUND) {
            var GROUND = 0;
        }

        var ADD_HEIGHT = 1000;
        var borderWidth = 100;
        var B = borderWidth;
        var W = BASE_WIDTH;
        var H = BASE_HEIGHT;
        var WE = W + 2 * B + 2 * SIDE;
        var HE = H + 2 * B - GROUND;
        var poligons = [
            boxPolyVertices(-B - SIDE, -B - ADD_HEIGHT, B, HE + ADD_HEIGHT),
            boxPolyVertices(W + SIDE, -B - ADD_HEIGHT, B, HE + ADD_HEIGHT),
            boxPolyVertices(-B - SIDE, H - GROUND, WE, B) ];
        worldBorder = Physics.createPolyComposite(0, 0, 0, poligons);
    }

    // TODO: remove?
    function putToSleep() { // 2dBody function
        world['m_contactManager']['CleanContactList']();
        this['m_flags'] |= b2Body['e_sleepFlag'];
        this['m_linearVelocity']['Set'](0.0, 0.0);
        this['m_angularVelocity'] = 0.0;
        this['m_sleepTime'] = 0.0;
    }

    // TODO: remove?
    function setBodyPoseByShape(position, angle) {
        this['SetCenterPosition'](position, angle);
        var shapeToBody = b2Math['SubtractVV'](this['m_position'],
            this['GetShapeList']()['GetPosition']());
        this['SetCenterPosition']
        (b2Math['AddVV'](position, shapeToBody), angle);
    }

    // TODO: remove?
    function getShapesCount() {// 2dBody function
        var shape = this['GetShapeList']();
        var shapesCount = 0;
        for (; shape != null; ++shapesCount, shape = shape['m_next'])
            ;
        return shapesCount;
    }

    // TODO: remove?
    function getShapeByIdx(shapeIdx) {// 2dBody function
        var shapesCount = this.getShapesCount();
        var listPosition = shapesCount - 1 - shapeIdx;
        var shape = this['GetShapeList']();
        for (var i = 0; i < listPosition; ++i) {
            if (!shape['m_next']) {
                eLog("bad shape idx!");
                return null;
            }
            shape = shape['m_next'];
        }

        return shape;
    }

    // TODO: remove?
    function setContactCallback(callback, shapeIdx) {
        if (shapeIdx != undefined) {
            this.getShapeByIdx(shapeIdx)['contactCallback'] = callback;
            return;
        }
        var shape = this['GetShapeList']();
        for (; shape != null; shape = shape['m_next']) {
            shape['contactCallback'] = callback;
        }
    }

    return { // public interface
        createWorld: function (gravity, sleep, ratioB2dToUl) {
            createWorld(gravity, sleep, ratioB2dToUl);
        },
        getWorld: function () {
            createWorld();
            assert(world, "No physics world created!");
            return world;
        },
        getB2dToGameRatio: function () {
            return b2dToGameRatio;
        },
        addBodyToDestroy: function (body) {
            bodiesToDestroy.push(body);
        },
        createWorldBorder: function (params) {
            createWorldBorder(params);
        },
        getContactProcessor: function () {
        	if (!contactProcessor)
        		contactProcessor = new ContactProcessor();
            return contactProcessor;
        },
        getContactListener: function () {
            return contactListener;
        },
        updateWorld: function () {
            if (pause === true)
                return;

            var world = Physics.getWorld();
            world.Step(1 / 45, 5, 5);
            if (timeout) {
                timeout.tick(15);
            }

            if (debugCanvas) {
                world.DrawDebugData();
            }
            world.ClearForces();
            for (var i = 0; i < updateItems.length; ++i) {
                updateItems[i].updatePositionFromPhysics();
                if (Screen.isDOMForced() === true && updateItems[i].initialPosRequiered === true) {
                	updateItems[i].initialPosRequiered = false;
            		updateItems[i].physics.SetAwake(false);
                }
            }
            if (bodiesToDestroy.length > 0) {
                for (var i = 0; i < bodiesToDestroy.length; ++i) {
                	if (world.IsLocked() === false)
                		world.DestroyBody(bodiesToDestroy[i]);
                	bodiesToDestroy[i].SetUserData(null);
                	bodiesToDestroy[i] = null;
                }
                bodiesToDestroy = [];
            }
        },
        getMaxSpeed: function () {
        	for (var i = 0; i < updateItems.length; ++i) {
                if (updateItems[i].physics && updateItems[i].physics.GetType()) {
                	maxSpeed.linearX = 0;
                	maxSpeed.linearY = 0;
                	maxSpeed.angular = 0;
                	maxSpeed.linearX = Math.max(maxSpeed.linearX, Math.abs(updateItems[i].physics.m_linearVelocity.x));
                	maxSpeed.linearY = Math.max(maxSpeed.linearY, Math.abs(updateItems[i].physics.m_linearVelocity.y));
                	maxSpeed.linear = Math.max(maxSpeed.linearX, maxSpeed.linearY);
                	maxSpeed.angular = Math.max(maxSpeed.angular, Math.abs(updateItems[i].physics.m_angularVelocity));
                }
            }
        	return maxSpeed;
        },
        getCalm: function (exclude) {
        	for (var i = 0; i < updateItems.length; ++i) 
                if (updateItems[i].physics && updateItems[i].physics.GetType() && updateItems[i].physics.IsAwake() === true)
                	return false;
            return true;
        },
        destroy: function (physics) {
            if (!physics) {
                return;
            }
            assert(world);
            world.DestroyBody(physics);
        },
        destroyWorld: function () {
            Physics.destroy(worldBorder);
            world = null;
            updateItems = [];
        },
        getWorldBorder: function () {
            if (!worldBorder) {
                createWorld();
            }
            assert(worldBorder);
            return worldBorder;
        },
        pause: function (v) {
            if (v == null) {
                pause = !pause;
            } else {
                pause = v;
            }
        },
        paused: function () {
            return pause;
        },
        resetTimeout: function (addTime) {
            if (!timeout) {
                return;
            }
            timeout.timeOut += addTime;
        },
        clearTimeout: function () {
            timeout = null;
        },
        setTimeout: function (callback, time) {
            timeout = {
                time: 0,
                callback: callback,
                timeOut: time,
                tick: function (delta) {
                    this.time += delta;
                    if (this.time < this.timeOut) {
                        return;
                    }
                    this.callback();
                    timeout = null;
                }
            };
        },
        updateItemAdd: function (entity) {
            var idx = updateItems.indexOf(entity);
            if (idx == -1) {
                updateItems.push(entity);
            }
        },
        updateItemRemove: function (entity) {
            var idx = updateItems.indexOf(entity);
            if (idx != -1) {
                updateItems.splice(idx, 1);
            }
        },
        destroy: function (entity) {
            if (!entity) {
                return;
            }
            Physics.updateItemRemove(entity);
            if (world && entity.physics) {
                world.DestroyBody(entity.physics);
            }
        },
        debugDrawing: function (trueOrFalse) {
            debugDrawing(trueOrFalse);
        },
        debugDrawingIsOn: function (trueOrFalse) {
            return !!debugCanvas;
        },
        setDebugModeEnabled: function (trueOrFalse) {
            debugMode = trueOrFalse;
        },
        debugMode: function () {
            return debugMode;
        },
        explode: function () {

        }
    };
})();

//TODO: remove?
var collisionCallback = function () {
    var entity1 = contact.GetFixtureA().GetBody().GetUserData();
    var entity2 = contact.GetFixtureB().GetBody().GetUserData();
    var material1 = entity1.descriptions.material;
    var material2 = entity2.descriptions.material;

    var materialImpact = Physics.getMaterialImpact(material1, material2);

    if (entity1.beginContact) {
        entity1.beginContact(entity2, materialImpact);
    }
    if (entity2.beginContact) {
        entity12.beginContact(entity1, materialImpact);
    }

    // position
    if (materialImpact.effect) {
        var effect = new VisualEffect(materialImpact.effect);
    }
};


var DAMAGE_DECR = 180;
var FORCE_RATING = 1/10;

// Creates physics explosion without any visual presentation
// just an explosion in physics world.
// center - center of the explosion;
// radiusMin, radiusMax - it`s radius <point>
// force - scalar force of impulse <number>
// damage - scalar force of damage <number>
// duration - explosion effect duration in <ms>
// decr - how fast force decreases by distance from center <number>
// owner - object that initiate explosion, should not affect it
Physics.explode = function(params) { // (center, radius, force, duration,
	// owner, decr) {
	var decr = (params.decr != null) ? params.decr : 1;
	DAMAGE_DECR = (params.damageDecr != null) ? params.damageDecr : 150;
	var world = Physics.getWorld();
	var score = 0;
	var delta = (params.delta > 0) ? params.delta : 20;
	var time = params.duration / delta;
	var scale = Physics.getB2dToGameRatio();
	function tick() {
		setTimeout(function() {
			var body = world.m_bodyList;
			for (; body != null; body = body['m_next']) {
				var bodyCenter = body.GetPosition().Copy();
				bodyCenter.Multiply(Physics.getB2dToGameRatio());
				var rVec = new b2Vec2(bodyCenter.x - params.center.x,
						bodyCenter.y - params.center.y);
				var dist = rVec.Length();
				if (dist < params.radius) {
					var impulse = rVec;
					impulse.Normalize();
					impulse.Multiply(FORCE_RATING * params.force
							/ Math.pow(1 + dist, decr));
					if (body.m_userData) {
						if (body.m_userData.params.id != "CannonBall") {
							body.SetAwake(false);
							body
									.ApplyImpulse(impulse, body
											.GetPosition());
//							body.AllowSleeping(true);
						}
					}

					if ((body.m_userData) && (body.m_userData.destructable)) {
						var damage = impulse.Length() / (DAMAGE_DECR!==0?DAMAGE_DECR:(params.damageDecr?params.damageDecr:1));
						body.m_userData.onDamage(damage);
						score += damage;
					}
				}
				;
			}
			;
			if (time < params.duration)
				tick();
			time += delta;
		}, 5);
	}
	;
	tick();
};/**
 * Contact Processor - part of the Physics singleton to
 * handle and process cantact events
 */

function ContactProcessor() {
	this.beginCallbacks = {};
	this.endCallbacks = {};
//	this.preSolveCallbacks = {};
//	this.postSolveCAllbacks = {};
};

ContactProcessor.prototype.init = function() {
	if (Physics.getContactListener())
		return;
	var that = this;
	var contactListener = Physics.getContactListener();
	contactListener = new Box2D.Dynamics.b2ContactListener;

    contactListener.BeginContact = function(contact) {
			that.processBegin(contact);	
    };
    contactListener.EndContact = function(contact) {
			that.processEnd(contact);	
    };
//    contactListener.PreSolve = function(contact, impulse) {
////	    		that.processPreSolve(contact, impulse);
//    };
//    contactListener.PostSolve = function(contact, oldManifold) {
////	    	that.processPostSolve(contact, oldManifold);
//    };
    var world = Physics.getWorld();
    world.SetContactListener(contactListener);
};


//
//	Adds pair to contact events dataset 
//
ContactProcessor.prototype.setContactBeginCalback = function(callback, param) {
	this.init();
	this.beginCallbacks[param] = callback;
};

ContactProcessor.prototype.getContactBeginCalback = function(entity) {
	return this.beginCallbacks[entity.className];
};

ContactProcessor.prototype.setContactEndCalback = function(callback, param) {
	this.init();
	this.endCallbacks[param] = callback;
};

ContactProcessor.prototype.getContactEndCallback = function(entity) {
	this.beginCallbacks[entity.className];
};

ContactProcessor.prototype.clearContactCallbacks = function(entity) {
	if (!entity) {
		this.beginCallbacks = {};
		this.endCallbacks = {};
	} else
		delete this.beginCallbacks[entity.className];
};

ContactProcessor.prototype.processBegin = function(contact) {
	var entityA = contact.GetFixtureA().GetBody().GetUserData();
	var entityB = contact.GetFixtureB().GetBody().GetUserData();
	var callback = entityA ? this.beginCallbacks[entityA.className] : false;
	if (callback && entityA.physics) 
		callback.call(entityA, contact, entityB);
	callback = entityB ? this.beginCallbacks[entityB.className] : false;
	if (callback && entityB.physics) 
		callback.call(entityB, contact, entityA);
};

ContactProcessor.prototype.processEnd = function(contact) {
	var entityA = contact.GetFixtureA().GetBody().GetUserData();
	var entityB = contact.GetFixtureB().GetBody().GetUserData();
	var callback = entityA ? this.endCallbacks[entityA.className] : false;
	if (callback && entityA.physics) 
		callback.call(entityA, contact, entityB);
	callback = entityB ? this.endCallbacks[entityB.className] : false;
	if (callback && entityB.physics) 
		callback.call(entityB, contact, entityA);
};/**
 * PhysicEntity - visual entity with representation in physics world
 */

var ANIM_DELAY = 400;
var POSITION_TRESHHOLD = 1;
var ROTATION_TRESHHOLD = 0.02;

/**
 * @constructor
 */
function PhysicEntity() {
    PhysicEntity.parent.constructor.call(this);
};

PhysicEntity.inheritsFrom(VisualEntity);
PhysicEntity.prototype.className = "PhysicEntity";

PhysicEntity.prototype.createInstance = function (params) {
    var entity = new PhysicEntity();
    entity.init(params);
    return entity;
};

entityFactory.addClass(PhysicEntity);

//
// Initializing and creating physic entity with visuals
//
PhysicEntity.prototype.init = function (params) {
	var description = {};
    this.physicsEnabled = true;
    if (Screen.isDOMForced())
    	this.initialPosRequiered = true;
    if (params.type != null)
        description = Account.instance.descriptionsData[params.type];
    PhysicEntity.parent.init.call(this, $['extend'](params, description));
    if (this.params.physics) {
        this.createPhysics();
        assert(!this.physics['m_userData']);
        this.physics['m_userData'] = this;
//TODO: check
        if (!this.physics.m_type == b2Body.b2_staticBody || Physics.debugMode())
            Physics.updateItemAdd(this);
    }
    this.material = null;
};

/**
 *  Create and register physics body
 */
PhysicEntity.prototype.createPhysics = function () {
    var fixtureDefList = [];
    var bodyDefinition;
    var physicParams = this.params['physics']; // preloaded from json
    this.params.x = this.params.x ? this.params.x : 0;
    this.params.y = this.params.y ? this.params.y : 0;
    var logicPosition = {
        x: this.params.x / Physics.getB2dToGameRatio(),
        y: this.params.y / Physics.getB2dToGameRatio()
    };

    function setShapeParams(fixtureDefinition, physicParams) {
        fixtureDefinition.density = selectValue(physicParams['density'], 1);
        fixtureDefinition.restitution = selectValue(physicParams.restitution, 0);
        fixtureDefinition.friction = selectValue(physicParams.friction, 0);
        fixtureDefinition.isSensor = selectValue(physicParams.sensor, false);
        fixtureDefinition.userData = selectValue(physicParams.userData, false);
        if (physicParams.filter != null) {
            fixtureDefinition.filter.categoryBits = selectValue(physicParams.filter.categoryBits, 0x0001);
            fixtureDefinition.filter.groupIndex = selectValue(physicParams.filter.groupIndex, 0);
            fixtureDefinition.filter.maskBits = selectValue(physicParams.filter.maskBits, 0xFFFF);
        }
    }

    bodyDefinition = new b2BodyDef();
    bodyDefinition.type = physicParams['static'] ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;
    bodyDefinition.userData = null;
    // Configuring shape params depends on "type" in json
    switch (physicParams.type) {
        case "Box":
        {
            var fixDef = new b2FixtureDef();
            fixDef.shape = new b2PolygonShape;
            fixDef.shape.SetAsBox(physicParams.width / (2 * Physics.getB2dToGameRatio()), physicParams.height /
                (2 * Physics.getB2dToGameRatio()));
            setShapeParams(fixDef, physicParams);
            fixtureDefList.push(fixDef);
            break;
        }
        case "Circle":
        {
            var fixDef = new b2FixtureDef();
            fixDef.shape = new b2CircleShape(physicParams.radius / Physics.getB2dToGameRatio());
            setShapeParams(fixDef, physicParams);
            fixtureDefList.push(fixDef);
            break;
        }
        case "Poly":
        {
            // TODO: not tested
            var fixDef = new b2FixtureDef();
            fixDef.shape = new b2PolygonShape();
            // apply offset
            var vertices = cloneObject(physicParams.vertices);
            $.each(vertices, function (id, vertex) {
                vertex.x = (vertex.x + physicParams.x) / Physics.getB2dToGameRatio();
                vertex.y = (vertex.y + physicParams.y) / Physics.getB2dToGameRatio();
            });

            fixDef.shape.SetAsArray(vertices, vertices.length);
            setShapeParams(fixDef, physicParams);
            fixtureDefList.push(fixDef);
            break;
        }
        // TODO: implement Triangle etc.
        /*
         case "Triangle": {
         shapeDefinition = new b2PolyDef();
         shapeDefinition.vertexCount = 3;
         shapeDefinition.vertices = physicParams.vertices;
         bodyDefinition.AddShape(shapeDefinition);
         setShapeParams(shapeDefinition, physicParams);
         break;
         }
         case "PolyComposite": {
         $['each'](physicParams.shapes, function(id, shapeData) {

         var shapeDef = new b2PolyDef();
         shapeDef.vertexCount = shapeData.vertexCount;
         var vertices = new Array();
         $['each'](shapeData.vertices, function(idx, vertex) {
         var newVertex = {};
         newVertex.x = physicParams.scale ? vertex.x
         * physicParams.scale : vertex.x;
         newVertex.y = physicParams.scale ? vertex.y
         * physicParams.scale : vertex.y;
         vertices.push(newVertex);
         });
         shapeDef.vertices = vertices;

         setShapeParams(shapeDef, shapeData);

         bodyDefinition.AddShape(shapeDef);
         });
         break;
         }*/
        case "PrimitiveComposite":
        {
            $.each(physicParams.shapes, function (id, fixtureData) {
                var fixDef = new b2FixtureDef();
                switch (fixtureData.type) {
                    case "Box":
                    {
                        fixDef.shape = new b2PolygonShape();
                        var localPos = new b2Vec2(fixtureData.x / Physics.getB2dToGameRatio(), fixtureData.y /
                            Physics.getB2dToGameRatio());
                        fixDef.shape.SetAsOrientedBox(fixtureData.width / (2 * Physics.getB2dToGameRatio()), fixtureData.height /
                            (2 * Physics.getB2dToGameRatio()), localPos);
                        break;
                    }
                    case "Circle":
                    {
                        fixDef.shape = new b2CircleShape(fixtureData.radius / Physics.getB2dToGameRatio());
                        fixDef.shape.SetLocalPosition(new b2Vec2(fixtureData.x / Physics.getB2dToGameRatio(), fixtureData.y /
                            Physics.getB2dToGameRatio()));
                        break;
                    }
                    case "Poly":
                    {
                        fixDef.shape = new b2PolygonShape();

                        // apply offset
                        $.each(fixtureData.vertices, function (id, vertex) {
                            vertex.x = (vertex.x + fixtureData.x) / Physics.getB2dToGameRatio();
                            vertex.y = (vertex.y + fixtureData.y) / Physics.getB2dToGameRatio();
                        });

                        fixDef.shape.SetAsArray(fixtureData.vertices, fixtureData.vertices.length);
                        break;
                    }
                    case "Triangle":
                    {
                        // TODO: implement?
                        /*shapeDefinition = new b2PolyDef();
                         shapeDefinition.vertexCount = 3;
                         shapeDefinition.vertices = physicParams.vertices;
                         bodyDefinition.AddShape(shapeDefinition);
                         setShapeParams(shapeDefinition, physicParams);*/
                        break;
                    }
                }
                setShapeParams(fixDef, fixtureData);
                fixtureDefList.push(fixDef);
            });
            break;
        }
    }

    // Configuring and creating body (returning it)
    bodyDefinition.position.Set(0, 0);
    bodyDefinition.linearDamping = physicParams.linearDamping != null ? physicParams.linearDamping : 0;
    bodyDefinition.angularDamping = physicParams.angularDamping != null ? physicParams.angularDamping : 0;
    var physicWorld = Physics.getWorld();
    this.physics = physicWorld.CreateBody(bodyDefinition);
    var that = this;
    $.each(fixtureDefList, function (id, fixDef) {
        that.physics.CreateFixture(fixDef);
    });

    this.physics.SetPosition(logicPosition);
    this.destructable = physicParams["destructable"];
    if (this.destructable)
        this.health = physicParams["health"];
    else
        this.health = null;
    if (this.params.angle)
        this.rotate(this.params.angle * 2);
};

PhysicEntity.prototype.getContactedBody = function () {
    if (this.physics.m_contactList)
        return this.physics.m_contactList.other;
};

PhysicEntity.prototype.getContactList = function () {
    return this.physics.m_contactList;
};

PhysicEntity.prototype.createVisual = function () {
    PhysicEntity.parent.createVisual.call(this);
};

// Update visual position from physics world
PhysicEntity.prototype.updatePositionFromPhysics = function (dontRotate, dontTranslate) {
    if (!this.physics || this.physicsEnabled === false || Physics.paused() === true || this.physics.IsAwake() === false)
        return false;
    
    this.positionUpdated = false;
    this.newPosition = this.getPosition();
    if (!dontTranslate && (!Screen.isDOMForced() || this.initialPosRequiered || !Device.isMobile() 
    		|| !this.lastUpdatedPos || Math.abs(this.newPosition.x - this.lastUpdatedPos.x) > POSITION_TRESHHOLD 
    		|| Math.abs(this.newPosition.y - this.lastUpdatedPos.y) > POSITION_TRESHHOLD)) {
	    this.lastUpdatedPos = this.getPosition();
	    this.setPosition(this.newPosition.x - this.params.physics.x - this.params.physics.width / 2,
	    		this.newPosition.y - this.params.physics.y - this.params.physics.height / 2);
	    this.positionUpdated = true;
	}

	this.newAngle = this.physics.GetAngle();
	if (!dontRotate && (!Screen.isDOMForced() || this.initialPosRequiered || !Device.isMobile() 
			|| !this.lastUpdatedAngle || Math.abs(this.newAngle - this.lastUpdatedAngle) > ROTATION_TRESHHOLD)) {
		this.lastUpdatedAngle = this.getPhysicsRotation().toFixed(3);
//		this.newAngle = MathUtils.toDeg(this.newAngle);
        for (var name in this.visuals)
        	this.visuals[name].visual.rotate(this.newAngle);
        this.positionUpdated = true;
	}
};

PhysicEntity.prototype.updatePosition = function () {
    this.setPosition(this.newPosition.x - this.params.physics.x - this.params.physics.width / 2,
	    		this.newPosition.y - this.params.physics.y - this.params.physics.height / 2);
    this.lastUpdatedPos = this.physics.GetPosition();
};

PhysicEntity.prototype.updateAngle = function () {
    for (var name in this.visuals)
    	this.visuals[name].visual.rotate(this.newAngle);
    this.lastUpdatedAngle = this.physics.GetAngle();
};

// Makes entity "kinematic" or dynamic
PhysicEntity.prototype.physicsEnable = function (v) {

     if (!v) {
    	 Physics.updateItemRemove(this);
     } else {
     if (!this.physics['IsStatic']() || Physics.debugMode())
    	 Physics.updateItemAdd(this);
     }
    this.physicsEnabled = !!v;
    this.physics.SetActive(this.physicsEnabled);
};

// Gets object rotation from physics (IN WHAT MEASURE? - in !Radians!)
PhysicEntity.prototype.getPhysicsRotation = function () {
    return this.physics.GetAngle();
};

/**
 *
 * @param {b2Vec2} pos logic position
 */
PhysicEntity.prototype.setPhysicsPosition = function (pos) {
    var pos = new b2Vec2(pos.x, pos.y);
    pos.Multiply(1 / Physics.getB2dToGameRatio());
   	this.physics.SetAwake(true);
    this.physics.SetPosition(pos);
    this.updatePositionFromPhysics();
};

/**
 * get logic position (using b2dToGameRatio)
 * @returns {b2Vec2}
 */
PhysicEntity.prototype.getPosition = function () {
    if (this.physics) {
        var pos = this.physics.GetPosition().Copy();
        pos.Multiply(Physics.getB2dToGameRatio());
        return pos;
    }
};

PhysicEntity.prototype.onDragBegin = function () {
    this.physicsEnable(false);
};

PhysicEntity.prototype.onDragEnd = function () {
    this.physicsEnable(true);
};

// Rotates object (as visual as physics) by local coord axis/ degrees angle
PhysicEntity.prototype.rotateByAxis = function (axis, angle) {
    // this.angle = angle;
    // Calculating rotation matrix for canon barrel and power line
    var matTrans = new Transform();
    matTrans.translate(axis.x, axis.y);
    var matRot = new Transform();

    matRot.rotateDegrees(angle);
    matTrans.multiply(matRot);
    matRot.reset();
    matRot.translate(-axis.x, -axis.y);
    matTrans.multiply(matRot);
    var that = this;
    $['each'](this.visuals, function (id, visualInfo) {
        var t = matTrans.transformPoint(that.params.x - that.params.physics.x,
                that.params.y - that.params.physics.y);
        that.physics.SetPosition(new b2Vec2(t[0], t[1]));
    });
};

// Rotates physics bodyand updates visual position
PhysicEntity.prototype.rotate = function (angleInRad) {
    var position = this.physics.GetPosition();
    var oldAngle = this.physics.GetAngle();
    var newAngle = oldAngle + angleInRad;
    if (Screen.isDOMForced())
    	this.physics.SetAwake(true);
    this.physics.SetPositionAndAngle(position, newAngle / 2);

    this.updatePositionFromPhysics();
    if (Screen.isDOMForced())
    	this.physics.SetAwake(false);
};

PhysicEntity.prototype.destroy = function () {
	this.destroyPhysics();
   	PhysicEntity.parent.destroy.call(this);
};

PhysicEntity.prototype.destroyPhysics = function () {
//	Physics.getContactProcessor().clearContactCallbacks(this);
    if (this.physics) {
    	Physics.updateItemRemove(this);
    	if (!Physics.getWorld().IsLocked()) {
    		this.physics.SetUserData(null);
    		Physics.getWorld().DestroyBody(this.physics);
    	} else
            Physics.addBodyToDestroy(this.physics);
        this.physics = null;
    }
};

// damage received by other object
PhysicEntity.prototype.onDamage = function (damage) {
    var that = this;
    if (!damage || !this.destructable || !this.health) 
        return;
    

    this.health = Math.max(this.health - damage, 0);

    // damage levels - show animation of different damages levels
    if (this.params.physics.destructionLevels) {
        $['each'](that.params.physics.destructionLevels, function (id, value) {
            if (that.health <= value["minHealth"]) {
                $['each'](that.visuals, function (id, visualInfo) {
                    visualInfo.visual.playAnimation(value["animName"],
                        ANIM_DELAY, false, true);
                });
                return;
            }
        });
    }

    if (this.health <= 0) {
        $['each'](that.visuals, function (id, visualInfo) {
            if (that.params.builtInDestruction)
                visualInfo.visual.setAnimationEndCallback(function () {
                	Account.instance.removeEntity(that.id);
                });
            else 
            	Account.instance.removeEntity(that.id);
            
            return;
        });
    }
};


PhysicEntity.prototype.setContactBeginCallback = function (callback) {
    Physics.getContactProcessor().setContactBeginCalback(callback, this.className);
};

PhysicEntity.prototype.setContactEndCallback = function (callback) {
    Physics.getContactProcessor().setContactEndCalback(callback, this.className);
};

PhysicEntity.prototype.setMaterial = function (material) {
    this.material = material;
};

PhysicEntity.prototype.getMaterial = function () {
    return this.material;
};
/**
 * PhysicsScene - abstract Scene class witch represents local physic world,
 * PhysicEntity`s container
 */

/**
 * @constructor
 */
function PhysicScene() {
	PhysicScene.parent.constructor.call(this);
};

PhysicScene.inheritsFrom(Scene);

PhysicScene.prototype.className = "PhysicScene";
PhysicScene.prototype.createInstance = function(params) {
	var entity = new PhysicScene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(PhysicScene);

PhysicScene.prototype.init = function(params) {
	PhysicScene.parent.init.call(this, params);
	this.physicWorld = Physics.getWorld();
};

PhysicScene.prototype.addChild = function(child) {
	PhysicScene.parent.addChild.call(this, child);
};

PhysicScene.prototype.createVisual = function() {
	PhysicScene.parent.createVisual.call(this);

	this.setInterval(Physics.updateWorld, 15);
};

PhysicScene.prototype.setBackgrounds = function(backgrounds, visual) {
	if (!visual) visual = this.getVisual();
	$['each'](backgrounds, function(key, value) {
		visual.setBackground(value.src, value.backWidth, value.backHeight,
				value.backX, value.backY, value.repeat, value.idx);
	});
	visual.resize();
};

PhysicScene.prototype.destroy = function() {
	Physics.getContactProcessor().clearContactCallbacks();
	PhysicScene.parent.destroy.call(this);
};


PhysicScene.prototype.attachChildVisual = function(child) {
	PhysicScene.parent.attachChildVisual.call(this, child);
};
/**
 * Physics Trigger
 */

CreatePhysicsTrigger = function(world, rect, action) {
	var instance = {};
	instance.rect = rect;
	instance.world = world;
	instance.action = action;

	instance.checkIfIn = function(position) {
		var ifIn = false;
		if (((position.x > instance.rect.left) && (position.x < instance.rect.right))
				&& ((position.y > instance.rect.top) && (position.y < instance.rect.bottom)))
			ifIn = true;
		return ifIn;
	};
	
	instance.move = function(x, y)
	{
		this.rect.left += x;
		this.rect.right += x;
		this.rect.top += y;
		this.rect.bottom += y;
	};
	
	instance.setPosition = function(x, y)
	{
		var w = rect.right - rect.left;
		var h = rect.bottom - rect.top;
		this.rect.left = x;
		this.rect.right = x + w;
		this.rect.top = y;
		this.rect.bottom = y + h;
	};

	instance.update = function() {
		var body = instance.world.m_bodyList;
		for (; body != null; body = body['m_next']) {
            var pos = body.GetPosition().Copy();
            pos.Multiply(Physics.getB2dToGameRatio());
			if (instance.checkIfIn(pos))
				instance.action(body);
		}
	};

	return instance;
};/**
 * Effect represents visual, sound etc effects
 */

/**
 * @constructor
 */
function Effect() {
	Effect.parent.constructor.call(this);
};

Effect.inheritsFrom(VisualEntity);
Effect.prototype.className = "Effect";

Effect.prototype.createInstance = function(params) {
	var entity = new Effect();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Effect);

Effect.prototype.init = function(params) {
	var description = {};
	if (params.type != null)
		description = Account.instance.descriptionsData[params.type];
	Effect.parent.init.call(this, $.extend(params, description));
	this.guis = new Array();
};

Effect.prototype.createVisual = function() {
};

//
//	Plays an effect, and destroys it`s result data after lifetime ended
//
Effect.prototype.play = function(position, callback) {
	var that = this;
	if (position) {
		that.x = position.x;
		that.y = position.y;
	}

	$['each'](that.params.visuals, function(id, value) {
		value.parent = that.guiParent;
		value.canvas = that.parent.getCanvas();
		position.x = position.x - value.width/2;
		position.y = position.y - value.height/2;
		var gui = guiFactory.createObject(value['class'], $['extend'](
				value, position));
		gui.clampByParentViewport();
		that.guis.push(gui);
		$['each'](gui.animations, function(id, anim) {
			gui.playAnimation(id, that.params.lifeTime, false, true);		
			that.setTimeout(function() {
				gui.hide();
				gui.remove();
				if (callback) callback();
			}, that.params.lifeTime);		
		});	
	});

};

Effect.prototype.destroy = function() {
	var that = this;
	Effect.parent.destroy.call(this);
	$['each'](that.guis, function(id, value) {
		value.remove();
		delete value;
	});
	that.guis = new Array();
};
//
var guiFactory = new AbstractFactory();

/**
 * @constructor
 */
guiFactory.createGuiFromJson = function(json, state) {
	guiFactory.createObjectsFromJson(json, function(name, params) {
		if (params['parent'] && typeof params['parent'] == "string") {
			// find parent among local objects or
			// assume that it is ID of existing DOM object
			var localParent = state.getGui(params['parent']);
			if (!localParent) {
				localParent = $(params['parent']);
				if (localParent.length == 0) {
					localParent = null;
				}
			}
			if (localParent) {
				params['parent'] = localParent;
				return;
			}
		}
		console.warn("For object '" + name + "' wrong parent '" + params['parent'] + "' is provided.");
	}, function(name, obj) {
		state.addGui(obj, name);
		if(obj.parent && obj.parent.children){
			obj.parent.children.addGui(obj, name);
		}
		obj.name = name;
	});
};
/**
 * @constructor
 */
function GuiContainer() {
	this.guiEntities = null;
}

GuiContainer.prototype.init = function() {
	this.guiEntities = new Array();
	this.guiEntitiesMap = new Object();
};
GuiContainer.prototype.resize = function() {
	for (var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].resize) {
			this.guiEntities[i].resize();
		}
	}
};

GuiContainer.prototype.update = function(time) {
	for (var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].update) {
			this.guiEntities[i].update(time);
		}
	}
};

GuiContainer.prototype.setUpdateInterval = function(time) {
	var that = this;
	this.updateIntervalTime = time;
	this.updateIntervalHandler = setInterval(function() {
		that.update(that.updateIntervalTime);
	}, this.updateIntervalTime);
};

GuiContainer.prototype.resetUpdateInterval = function() {
	if (this.updateIntervalHandler) {
		clearInterval(this.updateIntervalHandler);
		this.updateIntervalHandler = null;
		this.updateIntervalTime = null;
	}
};

GuiContainer.prototype.clear = function() {
	// console.log("Clear GuiContainer, there is %d entities",
	// this.guiEntities.length);
	for (var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].remove) {
			// console.log("Remove entity %s", this.guiEntities[i].src);
			this.guiEntities[i].remove();
		}
	}
	popAllElementsFromArray(this.guiEntities);
	this.guiEntitiesMap = {};
};

GuiContainer.prototype.remove = function() {
	this.clear();
	this.resetUpdateInterval();
};

GuiContainer.prototype.addGui = function(entity, name) {
	assert(entity, "Trying to add null pointer!");
	this.guiEntities.push(entity);

	if (typeof (name) == "string") {
		entity.name = name;
		this.guiEntitiesMap[name] = entity;
	}
	
	if (entity.onAdd)
		entity.onAdd();
};

GuiContainer.prototype.removeGui = function(entity) {
	popElementFromArray(entity, this.guiEntities);
	if (entity.name && this.guiEntitiesMap[entity.name]) {
		delete this.guiEntitiesMap[entity.name];
	}
	entity.remove();
};

GuiContainer.prototype.getGui = function(name) {
	return this.guiEntitiesMap[name];
};
/**
 * @constructor
 */
function GuiElement() {
}

GuiElement.prototype.className = "GuiElement";

GuiElement.prototype.createInstance = function(params) {
	var entity = new GuiElement();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiElement);

GuiElement.prototype.generateId = function() {
	return this.className + uniqueId();
};

GuiElement.prototype.generate = function(src) {
	assert(this.id, "Id not defined");
	assert(this.style, "Class for object with id = '" + this.id
			+ "' is not defined");
	return "<div id=\"" + this.id + "\" class=\"" + this.style
			+ " unselectable\">" + src + "</div>";
};

GuiElement.prototype.create = function(src) {
	// initial parent set

//	 console.log("Creating item with id %s, src = %s and classname = %s",
//	 this.id, src, this.className);
	if (!this.setParent(this.parent)) {
		// if no parent provided assigning to the body object
		this.setParent($("body"));
		console.warn("No parent was provided for object id = " + this.id);
	}

	src = (src == null) ? "" : src;
	var generated = this.generate(src);
	if(this.id == "GuiDiv1990"){
		console.log("Generated source for element: ", generated);
	}
	
	this.parent.jObject.append(generated);

	// remember jQuery object
	this.jObject = $("#" + this.id);
	assert(this.jObject.length > 0, "Object id ='" + this.id
			+ "' was not properly created");
};

GuiElement.prototype.$ = function() {
	return this.jObject;
};

GuiElement.prototype.setEnable = function(isEnable) {
	this.enable = isEnable;
};

GuiElement.prototype.isEnabled = function() {
	return this.enable == true;
};

GuiElement.prototype.callBindedFunction = function(event, bindType) {
	if (this.isEnabled()) {
		this[bindType](event);
	} else {
		console.log("Button is not enabled " + this.id);
	}
};

GuiElement.prototype.bind = function(bindFunction, bindType) {
	bindType = (typeof (bindType) == "string") ? bindType : "click";
	if (bindFunction) {
		this[bindType] = bindFunction;
	}
	if (!this[bindType]) {
		return;
	}

	this.unbind(bindType);

	var that = this;
	var callbackCaller = function(event) {
		that.callBindedFunction(event, bindType);
	};

	this.jObject['bind'](Device.event(bindType) + ".guiElementEvents",
			callbackCaller);
};

GuiElement.prototype.unbind = function(callbackType) {
	callbackType = (typeof (callbackType) == "string") ? callbackType : "";
	this.jObject['unbind'](callbackType + ".guiElementEvents");
};

GuiElement.prototype.init = function() {
	this.children.init();

	this.create(this.src);
	if (this.pushFunction) {
		this.bind(this.pushFunction);
	}

	this.resize();
};

GuiElement.prototype.initialize = function(params) {
	this.params = params;

	this.parent = params['parent'];

	// generate ID
	this.id = this.generateId();
	// Check whether element with such id is already in scene
	if ($("#" + this.id).length > 0) {
		console.error(" GuiElement with  id = '" + this.id
				+ "' is already exists.");
	}

	this.style = params['style'];
	this.width = params['width'];
	this.height = params['height'];
	// preventing clicking on the item to appear
	this.enable = true;
	this.children = new GuiContainer();
	this.children.init();

	this.src = params['html'] ? params['html'] : this.src;
	if (params['jObject']) {
		this.jObject = params['jObject'];

		// if (this.jObject[0] !== $('body')[0]) {
		// this.parent = guiFactory.createObject("GuiElement", {
		// "jObject" : this.jObject.parent()
		// });
		// }

	} else {
		this.create(this.src);
	}

	// attach 'this' as data to the element, so we can reference to it by
	// element id
	this.jObject['data']("guiElement", this);

	if (this.pushFunction) {
		this.bind(this.pushFunction);
	}

	var that = this;
	if (params['animations']) {
		$['each'](params['animations'], function(name, value) {
			that.addJqueryAnimation(name, value);
		});
	}

	this.setOffset(Screen.macro(params['offsetX']), Screen
			.macro(params['offsetY']));
	this.setPosition(Screen.macro(params['x']), Screen.macro(params['y']));
	this.setSize(Screen.macro(params['width']), Screen.macro(params['height']));
	if (typeof params['z'] == "number") {
		this.setZ(params['z']);
	}

	if (params['hide']) {
		this.hide();
	} else {
		this.show();
	}

	if (typeof params['opacity'] == "number") {
		this.setOpacity(params['opacity']);
	}

	this.resize();
};

GuiElement.prototype.setOffset = function(offsetX, offsetY) {
	this.offsetX = offsetX;
	this.offsetY = offsetY;
};

GuiElement.prototype.calcPercentageWidth = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentWidth = this.parent.jObject.width() / Screen.widthRatio();
		assert(typeof (parentWidth) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentWidth / 100.0);
	}
	return val;
};

GuiElement.prototype.calcPercentageHeight = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentHeight = this.parent.jObject.height() / Screen.heightRatio();
		assert(typeof (parentHeight) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentHeight / 100.0);
	}
	return val;
};

GuiElement.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;

	var offsetX = 0, offsetY = 0;
	if (typeof (this.offsetX) == "number") {
		offsetX = this.offsetX;
	}

	if (this.offsetY != null) {
		offsetY = this.offsetY;
	}

	x = this.calcPercentageWidth(x);
	y = this.calcPercentageHeight(y);

	this.setRealPosition(x + offsetX, y + offsetY);
};

GuiElement.prototype.move = function(dx, dy) {
	this.x += dx;
	this.y += dy;
	this.setPosition(this.x, this.y);
};

GuiElement.prototype.getRealPosition = function() {
	return {
		x : this.jObject['css']("left").replace("px", ""),
		y : this.jObject['css']("top").replace("px", "")
	};
};

GuiElement.prototype.getPosition = function() {
	return {
		x : this.x,
		y : this.y
	};
};

GuiElement.prototype.setZ = function(z) {
	this.jObject['css']("z-index", z);
	this.jObject['css']("-webkit-transform", "translateZ(0)");
	this.z = z;
};

GuiElement.prototype.show = function() {
	this.jObject['show']();
	this.visible = true;
};

GuiElement.prototype.hide = function() {
	this.jObject['hide']();
	this.visible = false;
};

GuiElement.prototype.setOpacity = function(opacity) {
	this.jObject['css']("opacity", opacity);
};

GuiElement.prototype.isEventIn = function(e) {
	var pos = Device.getPositionFromEvent(e);

	var left = this.$()['offset']()['left'];
	var right = left + this.$()['width']();
	var top = this.$()['offset']()['top'];
	var bottom = top + this.$()['height']();
	var isIn = (pos.x > left) && (pos.x < right) && (pos.y > top)
			&& (pos.y < bottom);

	return isIn;
};

GuiElement.prototype.addJqueryAnimation = function(name, description) {
	this.jqueryAnimations = this.jqueryAnimations ? this.jqueryAnimations
			: new Object();
	this.jqueryAnimations[name] = description;
};

GuiElement.prototype.playJqueryAnimation = function(name, callback) {
	var desc = this.jqueryAnimations[name];
	assert(desc, "No animation found with name '" + name + "'");

	this.stopJqueryAnimation();
	var finalAnimationState = null;

	var that = this;

	var updateDisplay = function(that, action) {
		that.setPosition(action["x"] || that.x, action["y"] || that.y);
		if (action["display"]) {
			if (action["display"] === "hide") {
				that.hide();
			} else if (action["display"] === "show") {
				that.show();
			}
		}
		// that.setSize(action["width"] || that.width, action["height"]
		// || that.height);
	};

	for ( var i = 0; i < desc.length; i++) {
		var actionDesc = desc[i];
		var action;
		if (action = actionDesc["animate"]) {
			var anim = new Object();
			$['each'](action["actions"], function(idx, params) {
				var param01 = params[0];
				var param02 = params[1];
				var param03 = params[2];

				if (param01 == "left" || param01 == "width") {
					param03 = (typeof (param03) == "number") ? Math
							.round(param03 * Screen.widthRatio()) : param03;
				} else if (param01 == "top" || param01 == "height") {
					param03 = (typeof (param03) == "number") ? Math
							.round(param03 * Screen.heightRatio()) : param03;
				}
				anim[param01] = param02 + param03.toString();
			});

			that.$()['animate'](anim, action["time"]);

		} else if (action = actionDesc["start"]) {
			var x = action["x"] != null ? action["x"] : that.x;
			var y = action["y"] != null ? action["y"] : that.y;
			that.setPosition(x, y);
			updateDisplay(that, action);
		} else if (action = actionDesc["final"]) {
			// force final params after all animations since
			// resize will call reset animation sequence or there's
			// can be option with animations disabled
			finalAnimationState = function() {
				var x = action["x"] != null ? action["x"] : that.x;
				var y = action["y"] != null ? action["y"] : that.y;
				that.setPosition(x, y);
				updateDisplay(that, action);
			};
		}
	}

	this.jqueryAnimationCallback = function() {
		if (finalAnimationState)
			finalAnimationState();
		if (callback)
			callback();
	};

	this.$()['queue']("fx", function() {
		that.jqueryAnimationCallback();
		that.jqueryAnimationCallback = null;
		that.jObject['stop'](true);
	});
};

GuiElement.prototype.stopJqueryAnimation = function() {
	if (!this.$()['is'](':animated')) {
		return;
	}
	this.$()['stop'](true);
	if (this.jqueryAnimationCallback) {
		this.jqueryAnimationCallback();
		this.jqueryAnimationCallback = null;
	}
};

GuiElement.prototype.isVisible = function() {
	return this.visible;
};

GuiElement.prototype.setSize = function(width, height) {
	this.width = width;
	this.height = height;

	this.resize();
};

GuiElement.prototype.setRealSize = function(width, height) {
	var size = Screen.calcRealSize(width, height);
	this.jObject['css']("width", size.x);
	this.jObject['css']("height", size.y);
};

GuiElement.prototype.setRealPosition = function(x, y) {
	var pos = Screen.calcRealSize(x, y);
	this.jObject['css']("left", pos.x);
	this.jObject['css']("top", pos.y);
};

GuiElement.prototype.resize = function() {
	var w = this.calcPercentageWidth(this.width);
	var h = this.calcPercentageHeight(this.height);
	this.setRealSize(w, h);
	this.setPosition(this.x, this.y);

	this.children.resize();
};

// prevents resizing of element
GuiElement.prototype.disableResize = function(isTrue) {
	if (this.originalResize == null) {
		this.originalResize = this.resize;
	}
	if (isTrue == false) {
		this.resize = this.originalResize;
	} else {
		this.resize = function() {
		};
	}
};

GuiElement.prototype.change = function(src) {
	this.src = src;
	this.detach();
	this.create(src);
	if (this.pushFunction) {
		this['bind'](this.pushFunction);
	}
	this.resize();
	this.show();
};

GuiElement.prototype.globalOffset = function() {
	var pos = this.jObject.offset();
	pos = Screen.calcLogicSize(pos.left, pos.top);

	return {
		x : pos.x,
		y : pos.y
	};
};

GuiElement.prototype.setParent = function(newParent, saveGlobalPosition) {
	// 'newParent' can be either string ID, JQuery object,
	// or object inherited of GuiElement
	var parent = null;
	var jParent = null;
	if (typeof newParent == "string") {
		jParent = $(newParent);
	} else if (newParent && typeof newParent == "object") {
		if (newParent['jquery']) {
			jParent = newParent;
		} else if (newParent.jObject && newParent.jObject.length > 0) {
			parent = newParent;
		}
	}
	// parent been represented as JQuery object
	if (jParent) {
		assert(jParent.length > 0, "Object id ='" + this.id
				+ "' has wrong parent: '" + newParent + "'");

		// check whether our parent already has GuiElement representation
		parent = jParent['data']("guiElement");
		if (!parent) {
			parent = guiFactory.createObject("GuiElement", {
				"jObject" : jParent
			});
		}
	}

	if (parent) {
		var oldParent = this.parent;
		this.parent = parent;

		// recalculate entity x,y so it will
		// stay at the same place on the screen after the parent change
		if (oldParent && saveGlobalPosition) {
			var oldParentPos, newParentPos;

			oldParentPos = oldParent.globalOffset();
			newParentPos = parent.globalOffset();

			var left = oldParentPos.x - newParentPos.x;
			var top = oldParentPos.y - newParentPos.y;
			this.move(left, top);
		}

		if (this.jObject) {
			this.jObject['appendTo'](parent.jObject);
		}
		return true;
	} else {
		console.error("Can't attach object '" + this.id
				+ "' to parent that doesn't exists '" + newParent + "'");
		return false;
	}
};

GuiElement.prototype.remove = function() {

	// console.log("Removing item with id %s, classname = %s", this.id,
	// this.className);
	if (this.canvas)
		this.canvas.removeFromRenderQueue(this);
	if(this.tooltip){
		this.tooltip.remove();
	}
	if (this.children)				/// TODO
		this.children.remove();
	if (this.jObject)			/// These two ifs are hack for canvas. Hardcore only, this must refactored
	this.jObject['remove']();
};

GuiElement.prototype.detach = function() {
	this.jObject['detach']();
};

GuiElement.prototype.addGui = function(entity, name) {
	this.children.addGui(entity, name);
};
GuiElement.prototype.removeGui = function(entity) {
	this.children.removeGui(entity);
};
GuiElement.prototype.getGui = function(name) {
	return this.children.getGui(name);
};

GuiElement.prototype.center = function() {
	this.jObject['css']("text-align", "center");
	// obj.wrap("<div class='middle'/>");
	// obj.wrap("<div class='inner'/>");
};

GuiElement.prototype.fadeTo = function(fadeValue, time, callback,
		dontChangeVisibility) {
	var that = this;
	if (this.fadeToTimeout) {
		clearTimeout(this.fadeToTimeout);
		this.fadeToTimeout = null;
	}

	if (!this.visible && !dontChangeVisibility) {
		// .hack for iOs devices we need a tiny delay
		// to avoid blinking

		// TODO setTimeout move to GuiElement class or create a GuiBase class
		this.fadeToTimeout = setTimeout(function() {
			that.show();
		}, 1);
	}
	// console.log("ANIMATION!!FUCK IF DEFINED",
	// CSSAnimations.get("fadeTo"+this.id));
	// var fadeTo = CSSAnimations.create("fadeTo"+this.id);
	// console.log("START OPACIY", this.jObject['css']("opacity"));
	// fadeTo.setKeyframe('0%', {
	// "opacity" : "" + this.jObject['css']("opacity")
	// });
	// fadeTo.setKeyframe('100%', {
	// "opacity" : "" + fadeValue
	// });
	// var obj = document.getElementById(this.id);
	// console.log(obj);
	// obj.style.webkitAnimationName = fadeTo.name;
	// obj.style.webkitAnimationDuration = (time / 1000) + "s";
	//
	// // obj.style.animationName=this.anim.fadeTo.name;
	// // obj.style.animationDuration=(time/1000)+"s";
	//
	// obj.addEventListener('webkitAnimationEnd', function() {
	// CSSAnimations.remove(fadeTo.name);
	// if(!CSSAnimations.get("fadeTo"+that.id)){
	// console.log("DELETED!!!!", "fadeTo"+that.id, fadeTo.name);
	// }else{
	// console.log("DSGLSDHGSDHGLDSGHLDSGHSDKJGNOTDELETED!!!!",
	// "fadeTo"+that.id, fadeTo.name);
	// }
	// if(callback){
	// callback();
	// }
	// });
	this.jObject['animate']({
		opacity : fadeValue
	}, time, callback);
};

GuiElement.prototype.blinking = function(isOn, blinkTime, blinkMin, blinkMax) {

	if (isOn) {
		var fadeTime = blinkTime ? blinkTime : 1000;

		var fadeIn, fadeOut;
		var that = this;
		fadeIn = function() {
			that.jObject['animate']({
				opacity : (blinkMin ? blinkMin : 0)
			}, fadeTime, fadeOut);
		};
		fadeOut = function() {
			that.jObject['animate']({
				opacity : (blinkMax ? blinkMax : 1)
			}, fadeTime, fadeIn);
		};
		fadeIn();
	} else {
		this.jObject['stop']();
	}
};

GuiElement.prototype.right = function() {
	this.jObject['css']("text-align", "right");
};

GuiElement.prototype.left = function() {
	this.jObject['css']("text-align", "left");
};

GuiElement.prototype.setClickTransparent = function(isTrue) {
	// TODO add IE and Opera support
	if (isTrue) {
		// this.jObject.bind("mousemove mousedown mouseup", function(e){
		// $(this).next().trigger(e);
		// });

		this.jObject['css']("pointer-events", "none");

	} else {
		this.jObject['css']("pointer-events", "auto");

	}
};

GuiElement.prototype.enableTouchEvents = function(push) {
	if (Device.isTouch()) {
		document.body.ontouchstart = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchStartX = touchEndX = e.touches[0].pageX;
			touchStartY = touchEndY = e.touches[0].pageY;
			// } else {
			// touchStartX = touchEndX = null;
			// touchStartY = touchEndY = null;
			// }
			return false;
		};

		document.body.ontouchmove = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchEndX = e.touches[0].pageX;
			touchEndY = e.touches[0].pageY;
			// }
			return false;
		};

		document.body.ontouchend = function(e) {
			e.preventDefault();
			if (touchEndX && touchEndY) {
				var e1 = {};
				e1.pageX = touchEndX;
				e1.pageY = touchEndY;
				push(e1);
			}
			return false;
		};
	} else {
		this.jObject['bind']("mousedown", push);
	}
};

// checks whether (x, y) in real global coords is inside element's bounds
GuiElement.prototype.isPointInsideReal = function(x, y) {
	var pos = this.jObject.offset();
	var width = this.jObject.width();
	var height = this.jObject.height();
	if ((x > pos.left && x < (pos.left + width))
			&& (y > pos.top && y < (pos.top + height))) {
		return true;
	} else {
		return false;
	}
};

GuiElement.prototype.getEventPosition = function(e) {
	var pos = Device.getPositionFromEvent(e);
	var elementPos = this.jObject['offset']();
	var needed = {};
	needed.x = pos.x - elementPos.left;
	needed.y = pos.y - elementPos.top;
	var result = Screen.calcLogicSize(needed.x, needed.y);
	return result;
};
/**
 * viewport and dragn drop functions 
 */

VIEWPORT_KILLER = false;

/**
 * @constructor
 */
function GuiDiv() {
	GuiDiv.parent.constructor.call(this);
}

GuiDiv.inheritsFrom(GuiElement);
GuiDiv.prototype.className = "GuiDiv";

GuiDiv.prototype.createInstance = function(params) {
	var entity = new GuiDiv();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiDiv);

GuiDiv.prototype.initialize = function(params) {
	this.divname = params['divname'];
	this.backgrounds = new Array();
	if (VIEWPORT_KILLER) this.disableViewport();
	// short alias for background
	if (params['image']) {
		params['background'] = {
			image : params['image']
		};
	}
	this.remote = params['remote'];
	/*
	 * if(params['background']instanceof Array){ for(var i = 0;i <
	 * params['background'].length;i++) {
	 * this.backgrounds.push(params['background'][i]); } }
	 */
	// ref to rect clamped by viewport
	this.viewRect = {};

	// DIV will be used as enhanced background to cover as much available
	// space on the screen as possible
	if (params['enhancedScene']) {
		params['width'] = params['width'] ? params['width']
				: ENHANCED_BASE_WIDTH;
		params['height'] = params['height'] ? params['height']
				: ENHANCED_BASE_HEIGHT;
		params['x'] = params['x'] ? params['x'] : -ENHANCED_BASE_MARGIN_WIDTH;
		params['y'] = params['y'] ? params['y'] : -ENHANCED_BASE_MARGIN_HEIGHT;
		this.enhancedScene = true;
		// enhancedScene is clamped by the maximum allowed screen size
		this.setViewport(Screen.fullRect());
	} else if (params['innerScene']) {
		// main scene is located on normal position inside enhanced scene
		params['width'] = params['width'] ? params['width'] : BASE_WIDTH;
		params['height'] = params['height'] ? params['height'] : BASE_HEIGHT;
		params['x'] = params['x'] ? params['x'] : ENHANCED_BASE_MARGIN_WIDTH;
		params['y'] = params['y'] ? params['y'] : ENHANCED_BASE_MARGIN_HEIGHT;
		this.innerScene = true;
	}
	GuiDiv.parent.initialize.call(this, params);
	this.applyBackground(params['background']);

	if (params['enhancedScene']) {
		this.resize();
	}

	assert(!this.innerScene || this.parent.enhancedScene,
			"inner scene should always be child to enhanced scene");

	if (this.innerScene) {
		this.clampByParentViewport();
	}
};

GuiDiv.prototype.generate = function(src) {
	return "<div id=\"" + this.id + "\" class=\"" + this.style
	+ " unselectable\""+((this.divname)?("name=\""+ this.divname +"\""):("")) +"></div>";
};

GuiDiv.prototype.empty = function() {
	this.jObject['empty']();
};

GuiDiv.prototype.applyBackground = function(params) {
	if (params instanceof Array) {
		var j = params.length - 1;
		for ( var i = 0; i < params.length; i++) {
			params[i]['image'] = Resources.getImage(params[i]['image']);
			this.setBackgroundFromParams(params[i], j--);
		}
	} else if (params) {
		params['image'] = this.remote?params['image']:Resources.getImage(params['image']);
		this.setBackgroundFromParams(params, null);
	}
};

GuiDiv.prototype.setBackground = function(src, backWidth, backHeight, backX, backY, repeat, frameX, frameY, idx) {
    if (idx == "begin") {
        this.backgrounds.unshift({});
        idx = 0;
    } else if (idx == "end") {
        idx = this.backgrounds.length;
    }

    idx = idx ? idx : 0;
    frameX = frameX ? frameX : (this.backgrounds[idx] && this.backgrounds[idx].frameX ? this.backgrounds[idx].frameX : 0);
    frameY = frameY ? frameY : (this.backgrounds[idx] && this.backgrounds[idx].frameY ? this.backgrounds[idx].frameY : 0);
    backWidth = backWidth ? backWidth : (this.backgrounds[idx] && this.backgrounds[idx].width ? this.backgrounds[idx].width : this.width);
    backHeight = backHeight ? backHeight : (this.backgrounds[idx] && this.backgrounds[idx].height ? this.backgrounds[idx].height : this.height);

    this.backgrounds[idx] = {
        url : src,
        width : backWidth,
        height : backHeight,
        left : backX ? backX : 0,
        top : backY ? backY : 0,
        frameX : frameX,
        frameY : frameY,
        repeat : (repeat ? repeat : "no-repeat")
    };

    this.showBackground();
//	this.resizeBackground();
};

GuiDiv.prototype.setBackgroundFromParams = function(param, j) {
	var x = param['x'] ? Screen.macro(param['x']) : 0;
	var y = param['y'] ? Screen.macro(param['y']) : 0;
	var w = param['width'] ? Screen.macro(param['width']) : this.width;
	var h = param['height'] ? Screen.macro(param['height']) : this.height;
    var frameX = param['frameX'] ? Screen.macro(param['frameX']) : 0;
    var frameY = param['frameY'] ? Screen.macro(param['frameY']) : 0;
	var r = param['repeat'] ? param['repeat'] : null;
	this.setBackground(param['image'], w, h, x, y, r, frameX, frameY, j);
};
GuiDiv.prototype.setBackgroundPosition = function(backX, backY, idx) {
	idx = idx ? idx : 0;

	var backgroundX = backX ? backX : 0;
	var backgroundY = backY ? backY : 0;
	this.backgrounds[idx].left = backgroundX;
	this.backgrounds[idx].top = backgroundY;

	this.setRealBackgroundPosition(0, 0);
};

GuiDiv.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	var positions = " ";
	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;
		var pos = Screen.calcRealSize(back.left + offsetX, back.top + offsetY);
		positions += pos.x + "px " + pos.y + "px,";
	});
	positions = positions.substr(0, positions.length - 1);
	this.jObject['css']("background-position", positions);
};

GuiDiv.prototype.resizeBackground = function() {
    var positions = " ";
    var sizes = " ";
    var that = this;
    $['each'](this.backgrounds, function(i, back) {
        if (!back)
            return;
        var pos = Screen.calcRealSize(back.left + back.frameX, back.top + back.frameY);
        positions += pos.x + "px " + pos.y + "px,";

        var w = that.calcPercentageWidth(back.width);
        var h = that.calcPercentageHeight(back.height);
        var size = Screen.calcRealSize(w, h);
        sizes += size.x + "px " + size.y + "px,";
    });
    sizes = sizes.substr(0, sizes.length - 1);
    positions = positions.substr(0, positions.length - 1);
    this.jObject['css']("background-size", sizes);
    this.jObject['css']("background-position", positions);
};

GuiDiv.prototype.setPosition = function(x, y) {
	GuiDiv.parent.setPosition.call(this, x, y);
	if (this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.resize = function() {
	// if this DIV is inner scene than adjust our position
	// by parent - enhancedScene
	// if (this.innerScene) {
	// var parent = this.parent;
	// this.setPosition(parent.viewRect.left, parent.viewRect.top);
	//
	// // innerScene by default is always visible, so it's
	// // clamped only by enhanced scene
	// this.viewRect.left = -parent.viewRect.left;
	// this.viewRect.top = -parent.viewRect.top;
	// this.viewRect.right = this.viewRect.left + parent.viewRect.width;
	// this.viewRect.bottom = this.viewRect.top + parent.viewRect.height;
	// this.viewRect.width = parent.viewRect.width;
	// this.viewRect.height = parent.viewRect.height;
	// }

	GuiDiv.parent.resize.call(this);

	this.resizeBackground();
	// TODO make optimization, currently setting size and pos twice
	// Consider removing this from GuiDiv
	if (this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.dragBegin = function(e) {
	if (this.dragStarted)
		return;

	DragManager.setItem(this, e);

	this.dragStarted = true;
	var pos = Device.getPositionFromEvent(e);
	this.dragX = pos.x;
	this.dragY = pos.y;
	if (this.onDragBegin)
		this.onDragBegin();
	this.$()['addClass']("dragged");

	// console.log("dragBegin");
};

GuiDiv.prototype.dragMove = function(e) {
	if (this.dragStarted) {
		var pos = Device.getPositionFromEvent(e);
		var dX = pos.x - this.dragX;
		var dY = pos.y - this.dragY;
		this.move(dX / Screen.widthRatio(), dY / Screen.heightRatio());
		this.dragX = pos.x;
		this.dragY = pos.y;
		// console.log("dragMove real " + this.id + ", " + this.x + ", " +
		// this.y);
	} else {
		// console.log("dragMove not real");
	}

};

GuiDiv.prototype.dragEnd = function(dragListener) {
	if (!this.dragStarted)
		return;

	// .hack seem like webkit bug, touchmove event will be halted
	// once we remove item form scene. So we remove button
	// only after drag n drop complete, thus onBeforeDragEnd callback
	if (this.onBeforeDragEnd)
		this.onBeforeDragEnd(dragListener);

	if (this.onDragEnd)
		this.onDragEnd(dragListener);
	this.$()['removeClass']("dragged");
	this.dragStarted = false;

	// console.log("dragEnd");
};

GuiDiv.prototype.setDragable = function(isTrue) {
	this.dragable = isTrue;
	if (isTrue) {
		var that = this;
		this.$().bind(Device.event("cursorDown") + ".dragEvents", function(e) {
			that.dragBegin(e);
		});
	} else {
		this.$()['unbind'](".dragEvents");
	}
};

// Setups Div as reciver for drag items
// callbacks to override: onDragItemEnter, onDragItemOut, onDragItemDrop
GuiDiv.prototype.setDragListener = function(isTrue, priority) {
	this.dragSlot = isTrue;
	if (isTrue) {
		if (priority) {
			this.dragListenerPriority = priority;
		}
		DragManager.addListener(this);
	} else {
		DragManager.removeListener(this);
		if (this.$ && this.$()) 				/// TODO Another hack for GuiCSprite. Must be refactord as soon as possible
			this.$()['unbind'](".dragEvents");
	}
};

GuiDiv.prototype.hideBackground = function() {
	this.jObject['css']("background-image", "none");
};

GuiDiv.prototype.showBackground = function() {
	var urls = " ";
	var repeats = " ";
	var positions = " ";

	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;
		if (back.url) urls += "url('" + back.url + "'),";

        // TODO: test it
        if (back.frameX && back.frameY) {
            var pos = Screen.calcRealSize(back.frameX, back.frameY);
            positions += pos.x + "px " + pos.y + "px,";
        }

		repeats += back.repeat + ",";
	});

	urls = urls.substr(0, urls.length - 1);
	repeats = repeats.substr(0, repeats.length - 1);
    positions = positions.substr(0, positions.length - 1);
	this.jObject['css']("background-image", urls);
	this.jObject['css']("background-position", positions);
	this.jObject['css']("background-repeat", repeats);
};

GuiDiv.prototype.clampByParentViewport = function(isTrue) {
	if (isTrue == false) {
		this.setViewport(null, null);
		this.resize();
	} else {
		this.setViewport(this.parent.viewRect, true);
	}
};

GuiDiv.prototype.setViewport = function(rect, isParent) {
	if(Screen.fixedSize || this.viewportDisable){
		this.viewport = null;
		return;
	}
	this.viewport = rect;
	this.isParentsViewport = isParent;

	if (this.jObject && this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.disableViewport = function(){
	this.viewportDisable = true;
	this.viewport = null;
};

GuiDiv.prototype.globalOffset = function() {
	var pos = this.jObject.offset();
	pos = Screen.calcLogicSize(pos.left, pos.top);

	var viewLeft = (this.viewRect && this.viewRect.left) ? this.viewRect.left
			: 0;
	var viewTop = (this.viewRect && this.viewRect.top) ? this.viewRect.top : 0;

	return {
		x : pos.x - viewLeft,
		y : pos.y - viewTop
	};
};

GuiDiv.prototype.clampByViewport = function() {
	if (!this.isVisible()) {
		return;
	}

	// 1) write down our rect
	var offsetX = this.offsetX ? this.offsetX : 0;
	var offsetY = this.offsetY ? this.offsetY : 0;
	var x = this.calcPercentageWidth(this.x) + offsetX;
	var y = this.calcPercentageHeight(this.y) + offsetY;
	var originalRect = {
		left : x,
		top : y,
		right : x + this.width,
		bottom : y + this.height
	};

	// 2) find out intersection rect between our rect and
	// parent rect - it will be new visibile rect for our div.
	// Rect will be in parent's coordinates
	var rect = this.viewport;
	var left = Math.max(originalRect.left, rect.left);
	var top = Math.max(originalRect.top, rect.top);
	var right = Math.min(originalRect.right, rect.right);
	var bottom = Math.min(originalRect.bottom, rect.bottom);

	var w = right - left;
	var h = bottom - top;

	// item is completely outside viewport, hide it
	if (w < 0 || h < 0) {
		if (!this.viewRect.isOutside) {
			this.jObject['hide']();
			this.viewRect.isOutside = true;
		}
	} else {
		if (this.viewRect.isOutside) {
			this.viewRect.isOutside = false;
			if (this.isVisible()) {
				this.jObject['show']();
			}
		}
	}

	var screenLeft = left;
	var screenTop = top;

	if (this.isParentsViewport) {
		screenLeft -= Math.max(rect.left, 0);
		screenTop -= Math.max(rect.top, 0);
	}
	this.setRealPosition(screenLeft, screenTop);
	this.setRealSize(w, h);

	// 3) calculate offset
	var offsetX = originalRect.left - left;
	var offsetY = originalRect.top - top;
	this.setRealBackgroundPosition(offsetX, offsetY);

	// calculate viewport for this Div for childrens to use
	if (this.innerScene) {
		// ignore boundaries of innerScene
		this.viewRect.left = rect.left - x;
		this.viewRect.top = rect.top - y;
		this.viewRect.right = rect.right - x;
		this.viewRect.bottom = rect.bottom - y;
		this.viewRect.width = rect.width;
		this.viewRect.height = rect.height;
		return;
	} else {
		this.viewRect.left = left - x;
		this.viewRect.top = top - y;
	}
	this.viewRect.right = this.viewRect.left + w;
	this.viewRect.bottom = this.viewRect.top + h;
	this.viewRect.width = w;
	this.viewRect.height = h;
	this.viewRect.offsetX = screenLeft;
	this.viewRect.offsetY = screenTop;

	var name = this.id;
	if (this.enhancedScene) {
		name += " Enhanced";
	} else if (this.innerScene) {
		name += " Inner";
	}

	// console.log(name + " " + "screen " + Math.round(screenLeft) + ", "
	// + Math.round(screenTop) + " originalRect "
	// + Math.round(originalRect.left) + ", "
	// + Math.round(originalRect.top) + " rect " + Math.round(rect.left)
	// + ", " + Math.round(rect.top) + " offset "
	// + Math.round(this.viewRect.left) + ", "
	// + Math.round(this.viewRect.top));

};


// Only perform show/hide check
GuiDiv.prototype.clampByViewportSimple = function() {

	// console.log("clamped");
	if (!this.isVisible()) {
		return;
	}
	var rect = this.viewport;

	// 1) write down our rect
	var offsetX = this.offsetX ? this.offsetX : 0;
	var offsetY = this.offsetY ? this.offsetY : 0;
	var x = this.calcPercentageWidth(this.x) + offsetX;
	var y = this.calcPercentageHeight(this.y) + offsetY;
	var originalRect = {
		left : x,
		top : y,
		right : x + this.width,
		bottom : y + this.height
	};

	var rect = this.viewport;

	var screenLeft, screenTop;
	if (this.isParentsViewport) {
		screenLeft = originalRect.left - rect.left;
		screenTop = originalRect.top - rect.top;
	}
	if (screenLeft + this.width < 0 || screenLeft > rect.width
			|| screenTop + this.height < 0 || screenTop > rect.height) {

		if (!this.viewRect.isOutside) {
			this.jObject['hide']();
			this.viewRect.isOutside = true;
		}
	} else {
		if (this.viewRect.isOutside) {
			this.jObject['show']();
			this.viewRect.isOutside = false;
		}
	}
	this.setRealPosition(screenLeft, screenTop);
};


GuiDiv.prototype.remove = function() {
	GuiDiv.parent.remove.call(this);
	this.setDragListener(false);
};

/**
 *
 * @param {number} width
 * @param {number} height
 * @param {number} idx background index. default 0
 */
GuiDiv.prototype.setSize = function (width, height, idx) {
    // using for frames from sprite sheet
    if (this.width != null) {
        var background = this.backgrounds[idx ? idx : 0];
        if (background && (background.frameX || background.frameY)) {
            var scaleX = width / this.width;
            var scaleY = height / this.height;
            background.width *= scaleX;
            background.height *= scaleY;
            background.frameX *= scaleX;
            background.frameY *= scaleY;
        }
    }

    GuiDiv.parent.setSize.call(this, width, height);
};/**
 * @constructor
 */
function GuiButton() {
	GuiButton.parent.constructor.call(this);
}

GuiButton.inheritsFrom(GuiDiv);
GuiButton.prototype.className = "GuiButton";

/**
 *
 * @param params
 * "class": "GuiButton",
 "params": {
            "parent": "menuContainer",
            "normal": {
                "background": {
                    "image": "FinalArt/countriesSheet.png",
                    "width": 689,
                    "height": 738,
                    "frameX": -477,
                    "frameY": -41
                }
            },
            "hover": {
                "background": {
                    "image": "FinalArt/countriesSheet.png",
                    "width": 689,
                    "height": 738,
                    "frameX": -477,
                    "frameY": -41
                },
                "scale": 120
            },
            "style": "gameButton",
            "width": 48,
            "height": 36,
            "x": 320,
            "y": 227
        }
 * @return {GuiButton}
 */
GuiButton.prototype.createInstance = function(params) {
	var entity = new GuiButton();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiButton);

GuiButton.prototype.generate = function(src) {
	var htmlText = "<div id='" + this.id + "' class='" + this.style + " unselectable'" + ((this.divname) ? ("name='" + this.divname + "'>") : (">"));
	htmlText += "</div>";

	return htmlText;
};

GuiButton.prototype.initialize = function(params) {
	this.divname = params['divname'];
	GuiButton.parent.initialize.call(this, params);

	// buttons is supposed to be small, so clamping it simple
	this.clampByViewport = GuiDiv.prototype.clampByViewportSimple;

	this.params = params;
	var that = this;
	this.label = {
		"hide" : false
	};

	if (params['active'] === false) {
		this.active = false;
	} else {
		this.active = true;
	}

	var labelParams;
	var normalParams = {};

	var prepareButtonState = function(params) {
		var image = GuiDiv.prototype.createInstance({
			parent : that,
			style : params['imageStyle'] ? params['imageStyle'] : "buttonImage",
			width : that.width,
			height : that.height,
			x : params['x'] ? params['x'] : "50%",
			y : params['y'] ? params['y'] : "50%",
            "background": params['background']
		});

		that.children.addGui(image);

		var w = selectValue(params['width'], normalParams['width'], that.width);
		var h = selectValue(params['height'], normalParams['height'], that.height);
		// if scale parameter exists scale size, scale specifies in percents
		if (params['scale']) {
			w = Math.round(w * params['scale'] / 100);
			h = Math.round(h * params['scale'] / 100);
		}

		var offsetX = -Math.round(w / 2);
		var offsetY = -Math.round(h / 2);

		image.setOffset(offsetX, offsetY);
		if (!params['background']) {
            params['image'] = Resources.getImage(params['image']);
			image.setBackground(params['image'], w, h, 0, 0);
		}
		image.setSize(w, h);
		image.hide();

		var label;
		if (params['label']) {
			labelParams = labelParams ? labelParams : params['label'];
			// if scale parameter exists then scale size, scale specifies in
			// percents
			var scale = 1;
			if (typeof params['scale'] == "number") {
				scale = params['scale'] / 100;
			}

			w = selectValue(params['label']['width'], labelParams['width'], that.width) * scale;
			h = selectValue(params['label']['height'], labelParams['height'], that.height) * scale;

			fontSize = selectValue(params['label']['fontSize'], labelParams['fontSize']) * scale;

			offsetX = selectValue(params['label']['offsetX'], labelParams['offsetX'], -Math.round(w / 2));
			offsetY = selectValue(params['label']['offsetY'], labelParams['offsetY'], -Math.round(h / 2));

			w = Math.round(w);
			h = Math.round(h);

			label = guiFactory.createObject("GuiLabel", {
				parent : image,
				style : selectValue(params['label']['style'], labelParams['style']),
				width : w,
				height : h,
				cursor : "pointer",
				text : selectValue(params['label']['text'], labelParams['text']),
				fontSize : fontSize,
				align : selectValue(params['label']['align'], labelParams['align'], "center"),
				verticalAlign : selectValue(params['label']['align'], labelParams['align'], "middle"),
				x : selectValue(params['label']['x'], labelParams['x'], "50%"),
				y : selectValue(params['label']['y'], labelParams['y'], "50%"),
				offsetX : params['label']['offsetX'] ? offsetX + params['label']['offsetX'] : offsetX,
				offsetY : params['label']['offsetY'] ? offsetY + params['label']['offsetY'] : offsetY
			});
			that.children.addGui(label);
			label.hide();
		}

		var callback = function() {
			// a bit hacky, but works
			// identify current state by reference to its params object
			if (that.currentStateParams === params) {
				return;
			} else {
				that.currentStateParams = params;
			}
			var oldCurrentImage = that.currentImage;
			var oldCurrentLabel = that.currentLabel;

			that.currentImage = image;
			if (that.currentImage) {
				that.currentImage.show();
			}

			that.currentLabel = label;
			if (that.currentLabel && that.label.hide === false) {
				that.currentLabel.show();
			}
			if (oldCurrentLabel) {
				oldCurrentLabel.hide();
			}
			if (oldCurrentImage) {
				oldCurrentImage.hide();
			}
		};
		return {
			image : image,
			label : label,
			callback : callback
		};
	};

	// normal state (unpressed button)
	if (params['normal']) {
		normalParams = params['normal'];
		var resultNormal = prepareButtonState(params['normal']);
		that.label['normal'] = resultNormal.label;
		that.imageNormal = resultNormal.image;
		that.normalState = function() {
			resultNormal.callback.call(that);
			that.clickAllowed = false;
		};
		that.normalState.call(that);
	}

	// mouse over the button
	if (!Device.isTouch()) {
		if (params['hover']) {
			var result = prepareButtonState(params['hover']);
			that.label['hover'] = result.label;
			that.imageHover = result.image;
			that.hoverState = result.callback;
		}
		// button pressed
		if (params['active']) {
			var result = prepareButtonState(params['active']);
			that.imageActive = result.image;
			that.label['active'] = result.label;
			that.activeState = result.callback;
		} else {
			if (params['hover']) {
				that.activeState = that.normalState;
			}
		}
	} else {
		if (params['hover']) {
			var result = prepareButtonState(params['hover']);
			that.label['hover'] = result.label;
			that.imageActive = result.image;
			that.activeState = result.callback;
		}
	}
	// passive state (button cannot be clicked)
	if (params['passive']) {
		passiveParams = params['passive'];
		var resultPassive = prepareButtonState(params['passive']);
		that.label['passive'] = resultPassive.label;
		that.imagePassive = resultPassive.image;
		that.passiveState = function() {
			resultPassive.callback.call(that);
			that.clickAllowed = false;
		};
		if (!that.active) {
			that.passiveState.call(that);
		}
	}
};

GuiButton.prototype.changeLabel = function(text) {
	$['each'](this.label, function(index, value) {
		if (index == "hide") {
			return;
		}
		value.change(text);
	});
};

GuiButton.prototype.hideLabel = function() {
	this.label.hide = true;
	$['each'](this.label, function(index, value) {
		if (index == "hide") {
			return;
		}
		value.hide();
	});
};

GuiButton.prototype.showLabel = function() {
	this.label.hide = false;
	$['each'](this.label, function(index, value) {
		if (index == "hide") {
			return;
		}
		value.show();
	});
};

GuiButton.prototype.bind = function(pushFunction) {
	// simple onclick event without any effects for button
	if (!this.activeState) {
		GuiButton.parent.bind.call(this, pushFunction);
		return;
	}
	var that = this;

	this.backedToNormal = false;
	this.clickAllowed = false;
	this.unbind();
	if (this.hoverState && !Device.isTouch()) {
		this.jObject.bind("mouseenter.guiElementEvents", function() {
			if (!that.active) {
				return;
			}
			that.hoverState();
		});
		this.jObject.bind("mouseleave.guiElementEvents", function() {
			if (!that.active) {
				that.passiveState();// temporary hack
				return;
			}
			that.normalState();
		});
	}

	if (pushFunction) {
		this.pushFunction = pushFunction;
	}
	var backToNormalCallback = this.hoverState ? this.hoverState : this.normalState;

	var callbackCaller = function(event) {
		if (!that.active)
			return;
		if (that.isEnabled()) {
			if (that.clickAllowed) {
				if (that.pushFunction) {
					var name = event.currentTarget.getAttribute("name");
					if (name) {
						// if (name == "screen") {
						// Recorder.recordAction("clickedAt", name, {
						// x : event.offsetX,
						// y : event.offsetY
						// });
						// } else {
						// Recorder.recordAction("click", name);
						// }
					}
					that.pushFunction(event);
				}
				that.clickAllowed = false;
			}
			backToNormalCallback.call(that);
		}
	};

	if (this.activeState) {
		if (!Device.isTouch()) {
			this.jObject.bind("mousedown", function() {
				if (!that.active)
					return;
				that.activeState.call(that);
				that.clickAllowed = true;
			});
			this.jObject.bind("mouseup", callbackCaller);
		} else {
			this.jObject.bind("touchstart", function() {
				if (!that.active)
					return;
				that.activeState.call(that);
				that.clickAllowed = true;
				that.backedToNormal = false;
			});
			this.jObject.bind("touchend", callbackCaller);
			this.jObject.bind("touchmove", function(e) {
				if (!that.active)
					return;
				if (that.backedToNormal) {
					return;
				}

				e.preventDefault();
				var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
				var obj = $(document.elementFromPoint(touch.pageX, touch.pageY));

				if (!that.isPointInsideReal(touch.pageX, touch.pageY)) {
					backToNormalCallback.call(that);
					that.backedToNormal = true;
				}
			});
		}

	}
	this.jObject['css']("cursor", "pointer");
//	$['each'](this.label, function(index, value) {
//		if (index == "hide") {
//			return;
//		}
//		if(value){
//			value.jObject['css']("cursor", "pointer");
//		}
//	});
};

// change background in all of button states
GuiButton.prototype.changeButtonBackgrounds = function(params, idx) {
	if (this.imageNormal) {
		this.imageNormal.setBackgroundFromParams(params, idx);
	}
	if (this.imageHover) {
		this.imageHover.setBackgroundFromParams(params, idx);
	}
	if (this.imageActive) {
		this.imageActive.setBackgroundFromParams(params, idx);
	}
	if (this.imagePassive) {
		this.imagePassive.setBackgroundFromParams(params, idx);
	}
};

GuiButton.prototype.setButtonBackgrounds = function(img) {
	if (this.imageNormal) {
		this.imageNormal.setBackground(img);
	}
	if (this.imageHover) {
		this.imageHover.setBackground(img);
	}
	if (this.imageActive) {
		this.imageActive.setBackground(img);
	}
	if (this.imagePassive) {
		this.imagePassive.setBackground(img);
	}
};

// show or hides background
// changes background for highlighted
GuiButton.prototype.highlight = function(isOn) {
	if (this.params['highlight']) {
		if (isOn) {
			this.img = this.params['background']['image'];
			this.setBackground(Resources.getImage(this.params['highlight']['image']));
			this.backgroundShown = isOn;
			this.showBackground();
		} else {
			this.setBackground(this.img);
			this.showBackground();
		}
	} else {
		this.backgroundShown = isOn;
		if (this.backgroundShown) {
			this.showBackground();
		} else {
			this.hideBackground();
		}
	}

};

GuiButton.prototype.isActive = function() {
	return this.active;
};

GuiButton.prototype.activate = function(isActive) {
	if (!this.params['passive']) {
		return;
	}
	if (isActive === false) {
		this.passiveState();
		this.active = false;
	} else {
		this.active = true;
		this.normalState();
	}
};

GuiButton.prototype.resize = function() {
	GuiButton.parent.resize.call(this);
};
/**
 * Label with text that can be aligned vertically and horizontally
 */

/**
 * @constructor
 */
function GuiLabel() {
	GuiLabel.parent.constructor.call(this);
}

GuiLabel.inheritsFrom(GuiElement);
GuiLabel.prototype.className = "GuiLabel";

GuiLabel.prototype.createInstance = function(params) {
	var entity = new GuiLabel();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiLabel);

GuiLabel.prototype.initialize = function(params) {
	this.divname = params['divname'];
	GuiLabel.parent.initialize.call(this, params);

	this.fontSize = params['fontSize'] ? params['fontSize'] : 20;
	this.change(params['text']);
	if(params['cursor']){
		this.jObject['css']("cursor", params['cursor']);
		this.cursor = params['cursor'];
	}
	if (params['align']) {
		this.align(params['align'], params['verticalAlign']);
	}
	if (params['color']) {
		this.setColor(params['color']);
	}
	
	this.setLineHeight(params['lineHeight']?params['lineHeight']:1);
};

GuiLabel.prototype.generate = function(src) {
	var id = this.id;
	this.rowId = this.id + "_row";
	this.cellId = this.id + "_cell";
	return "<div id='" + this.id + "' class='" + this.style + " unselectable' style='cursor: default'>"
	+ "<div id='" + this.rowId + "' style='display:table-row; '>"
	+ "<div id='" + this.cellId +"'"+((this.divname)?(" name='"+ this.divname +"'"):(""))+ " style='display:table-cell;'>"
	+ src + "</div></div></div>";
};

GuiLabel.prototype.create = function(src) {
	GuiDiv.parent.create.call(this, src);
	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");

};

GuiLabel.prototype.change = function(src, fontSize) {
	src = Resources.getString(src);
	$("#" + this.cellId).text(src);
	if (fontSize)
		this.fontSize = fontSize;
//	console.error(this.id,this.cellId, $("#" + this.cellId).text());
	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");
//	this.resize();
};

GuiLabel.prototype.append = function(src) {
	$("#" + this.cellId).append(src);
	this.resize();
};

GuiLabel.prototype.empty = function() {
	$("#" + this.cellId).empty();
	this.resize();
};

GuiLabel.prototype.setPosition = function(x, y) {
	GuiLabel.parent.setPosition.call(this, x, y);

};

GuiLabel.prototype.setRealSize = function(width, height) {
	GuiLabel.parent.setRealSize.call(this, width, height);

	var size = Screen.calcRealSize(width, height);
	$("#" + this.rowId)['css']("width", size.x);
	$("#" + this.rowId)['css']("height", size.y);
	$("#" + this.cellId)['css']("width", size.x);
	$("#" + this.cellId)['css']("height", size.y);

	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");
	// cssTransform($("#" + this.cellId), null, null, Screen.widthRatio(),
	// Screen.heightRatio());

};

GuiLabel.prototype.resize = function() {
	GuiLabel.parent.resize.call(this);
};

GuiLabel.prototype.setColor = function(color) {
	this.jObject['css']("color", color);
};

GuiLabel.prototype.setLineHeight = function(lineHeight) {
	this.jObject['css']("line-height", lineHeight);
};

GuiLabel.prototype.align = function(alignH, alignV) {
	if (alignH) {
		$("#" + this.cellId)['css']("text-align", alignH);
	}
	if (alignV) {
		$("#" + this.cellId)['css']("vertical-align", alignV);
	}
};
/**
 * Scrolling group of elements
 */

/**
 * @constructor
 */
function GuiScroll() {
	GuiScroll.parent.constructor.call(this);
}

GuiScroll.inheritsFrom(GuiElement);
GuiScroll.prototype.className = "GuiScroll";

GuiScroll.prototype.generate = function(src) {
	this.listId = this.id + "_list";
	this.scrollId = this.id + "_scroll";
	this.listId = this.scrollId;

	return "<div id='" + this.id + "' class='" + this.style
			+ " scrollerWrapper " + "unselectable'>" + "<div id='"
			+ this.scrollId + "' class='scrollerBackground'>"
			// + "<ul id=\"" + this.listId + "\"></ul>"
			+ "</div></div>";
};

GuiScroll.prototype.createInstance = function(params) {
	var entity = new GuiScroll(params['parent'], params['style'],
			params['width'], params['height']);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiScroll);

GuiScroll.prototype.initialize = function(params) {
	GuiScroll.parent.initialize.call(this, params);
	this.createScroll();
};

GuiScroll.prototype.createScroll = function() {
	var thisGuiScroll = this;
	this.hScroll = (this.params['hScroll'] != null) ? this.params['hScroll']
			: true;
	this.vScroll = (this.params['vScroll'] != null) ? this.params['vScroll']
			: true;
	
	if (this.params["fixedHeight"])
	this.setFixedHeight(this.params["fixedHeight"]);
	
	this.scroll = new iScroll(this.id, {
		'hScroll' : this.hScroll,
		'vScroll' : this.vScroll,
		'useTransform' : true,
		'onBeforeScrollStart' : function(e) {
			var target = e.target;
			while (target.nodeType != 1) {
				target = target.parentNode;
			}

			// if (target.tagName != 'SELECT' && target.tagName != 'INPUT' &&
			// target.tagName != 'TEXTAREA')
			e.preventDefault();

			// console.log("candidate " + target.id);
		},
		'onScrollStart' : function(e) {
			var target = e.target;
			thisGuiScroll.candidateToClick = null;

			while (true) {
				// a text element or element without id - skip it
				if (target.nodeType != 1 || target.id == '') {
					target = target.parentNode;
					continue;
				}

				// console.log("try to click " + target.id);
				var item = $("#" + target.id);
				if (item.length > 0) {
					var element = item['data']("guiElement");
					// console.log("element is " + element);

					// TODO listItemClickCallback and listItemMouseDownCallback
					// hacks
					// should be moved to GuiButton
					if (element) {
						if (element.listItemClickCallback) {
							thisGuiScroll.candidateToClick = element;
							break;
						} else if (element.listItemMouseDownCallback) {
							element.listItemMouseDownCallback(e);
							break;
						}
						// console.log("candidate " +
						// thisGuiScroll.candidateToClick.id);
					}
				}
				target = target.parentNode;

				// we have no parent or reached scroll element itself
				if (!target || target.id == thisGuiScroll.listId
						|| target.id == thisGuiScroll.scrollId
						|| target.id == thisGuiScroll.id)
					break;
			}
		},
		'onScrollMove' : function(e) {
			thisGuiScroll.candidateToClick = null;
		},
		'onBeforeScrollEnd' : function() {
			if (thisGuiScroll.candidateToClick) {
				thisGuiScroll.candidateToClick.listItemClickCallback();
				thisGuiScroll.candidateToClick = null;
			}
		}
	});
};

GuiScroll.prototype.refresh = function(height) {
	this.scroll['scrollTo'](0, 0, 0, false);
	if (this.fixedHeight) {
		this.scroll['refresh'](this.fixedHeight * Screen.heightRatio());
	} else {
		this.scroll['refresh']();
	}
};

GuiScroll.prototype.addListItem = function(item) {
	// var listItemId = this.listId + "_item" + uniqueId();
	// $("#" + this.listId).append("<li id='" + listItemId + "'></li>");
	// if (typeof item === "string") {
	// $("#" + listItemId).html(item);
	// } else {
	// item.setParent(listItemId);
	// }

	item.setParent("#" + this.listId);
	// allow events to propagate to reach the scroll
	item.unbind();
	this.children.addGui(item);

	this.resize();
};

GuiScroll.prototype.removeListItem = function(item) {
	this.children.removeGui(item);
	this.resize();
};

GuiScroll.prototype.clearList = function() {
	$("#" + this.listId).empty();
	this.children.clear();
};

GuiScroll.prototype.remove = function() {
	if(this.scroll){
		this.scroll['destroy']();
		delete this.scroll;
	}
	GuiScroll.parent.remove.call(this);
};

GuiScroll.prototype.resizeScroll = function() {
	// a bit hacky. To enable horizontal scrolling
	// make sure that we will have enough width.
	if (this.hScroll && !this.vScroll) {
		var totalWidth = 0;
		for ( var i = 0; i < this.children.guiEntities.length; i++) {
			totalWidth += this.children.guiEntities[i].$()['outerWidth'](true);
		}
		$("#" + this.listId)['width'](totalWidth);
	}
};

GuiScroll.prototype.setFixedHeight = function(height) {
	this.fixedHeight = height;
};

GuiScroll.prototype.resize = function() {
	GuiScroll.parent.resize.call(this);
	this.resizeScroll();
	if (this.scroll) {
		this.refresh();
	}
};

var GUISPRITE_HACK_ON = false;

/**
 * @constructor
 */
function GuiSprite() {
	GuiSprite.parent.constructor.call(this);
}

GuiSprite.inheritsFrom(GuiDiv);
GuiSprite.prototype.className = "GuiSprite";

GuiSprite.prototype.createInstance = function(params) {
	var entity = new GuiSprite();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiSprite);

GuiSprite.prototype.initialize = function(params) {
	GuiSprite.parent.initialize.call(this, params);

	// .hack temporary disable viewport for sprites at all
	this.clampByViewport = this.clampByViewportSimple;
//	this.canvas = params['canvas']? params.canvas : null;
	this.canvas = null; 
	
	this.totalWidth = params['totalImageWidth'];
	this.totalHeight = params['totalImageHeight'];
	this.frameCallback = null;
	this.offsetY1 = 0;
	this.offsetX1 = 0;
	this.totalSrc = params['totalImage'];
	// // .hack temporary for older games
	if (GUISPRITE_HACK_ON) {
		this.totalSrc = Resources.getImage(params['totalImage']);
	}

	if (params['totalTile'] == null) {
		this.totalTile = {
			x : 0,
			y : 0
		};
	} else {
		this.totalTile = params['totalTile'];
	}
    this.flipped = params['flipped'] != null ? params['flipped'] : false;

	this.setBackground(this.totalSrc);

	this.currentAnimation = null;
	this.spatialAnimation = null;
	this.animations = new Object();

	var that = this;
	if (params['spriteAnimations']) {
		$['each'](params['spriteAnimations'], function(name, value) {
			// console.log("Adding sprite animation " + name);
			that.addSpriteAnimation(name, value);
		});
	}

	this.jObject['css']("background-position", Math.floor(Screen.widthRatio()
			* this.totalTile.x * this.width)
			+ "px "
			+ Math.floor(Screen.heightRatio() * this.height * this.totalTile.y)
			+ "px");

	this.resize();

	if (params['startAnimation']) {
		this.playAnimation(params['startAnimation']['name'],
				params['startAnimation']['duration'],
				params['startAnimation']['loop']);
		this.setStaticUpdate(true);
	}
	
	this.frames = {};
	if(params['frames']){
		this.frames = params['frames']; 
	}

};

GuiSprite.prototype.setStaticUpdate = function(isStatic){
	if(isStatic === false){
		delete Account.instance.staticSprites[this.id];
	}else{
		Account.instance.staticSprites[this.id] = this;
	}
};

GuiSprite.prototype.addSpriteAnimation = function(name, description) {
	this.animations[name] = {
		frames : description['frames'],
		row : description['row'],
		frameDuration : description['frameDuration'],
		spatial : description['spatial']
	};
};

GuiSprite.prototype.addAnimation = function(animationName, frames, row,
		frameDuration) {
	this.animations[animationName] = {
		frames : frames,
		row : row,
		frameDuration : frameDuration
	};
};

GuiSprite.prototype.update = function(dt) {
	if (this.currentAnimation == null && this.spatialAnimation == null) {
		return;
	}

	var curTime = (new Date()).getTime();
	if (!dt) {
		dt = curTime - this.lastUpdateTime;
	}
	this.lastUpdateTime = curTime;
	this.currentFrameTime += dt;

	if (this.spatialAnimation !== null) {
		this.updateSpatialAnimation(dt);
	}
	while (this.currentFrameTime >= this.currentFrameLength) {
		var stopped = this.updateAnimation();
		if (stopped == true) {
			return;
		}
		this.currentFrameTime -= this.currentFrameLength;
	}
};

GuiSprite.prototype.changeBackgroundPosition = function(x, y) {
	this.jObject['css']("background-position", Math.round(-Screen.widthRatio()
			* x + Screen.heightRatio() * this.offsetX1)
			+ "px "	+ Math.round(-Screen.heightRatio() * y
					+ Screen.heightRatio() * this.offsetY1) + "px ");
};

GuiSprite.prototype.changeBackgroundPositionReal = function(x, y) {
	this.jObject['css']("background-position", Math.round(Screen.widthRatio()
			* (x * this.width + this.offsetX1))
			+ "px "
			+ Math.round(Screen.heightRatio() * (y * this.height + this.offsetY1))
			+ "px ");
};

GuiSprite.prototype.selectFrame = function(frame, row) {
	this.changeBackgroundPosition(frame * this.width, row * this.height);
};

GuiSprite.prototype.updateSpatialAnimation = function(dt, dontResize) {
	if (this.spatialAnimation == null) {
		return;
	}
	var part = dt / this.spatialAnimation.duration;
	if (this.spatialAnimation.timeLeft > dt) {
		this.move(this.spatialAnimation.dx * part, this.spatialAnimation.dy
				* part);
	} else {
		part = this.spatialAnimation.timeLeft / this.spatialAnimation.duration;
		this.move(this.spatialAnimation.dx * part, this.spatialAnimation.dy
				* part);
		if (this.spatialAnimation.callback) {
			this.spatialAnimation.callback();
		}
		this.spatialAnimation = null;
	}
	if (this.spatialAnimation) {
		this.spatialAnimation.timeLeft -= dt;
	}
	if (!dontResize)
		this.resize();
};

GuiSprite.prototype.updateAnimation = function() {
	if (this.currentAnimation == null)
		return;
	if (this.currentFrame >= this.animations[this.currentAnimation].frames.length) {
		this.currentFrame = 0;
		if (!this.looped) {
			this.stopAnimation();
			return true;
		}
	}

	var rowFramesLength = Math.round(this.totalWidth / this.width);
	var frame = this.animations[this.currentAnimation].frames[this.currentFrame];
	
	if(this.frames[frame]){
		var frm = this.frames[frame]; 
		this.changeBackgroundPosition(frm.x, frm.y);
//		this.jObject['css']("background-position", Math.round(-Screen.widthRatio()
//				* frm.x + Screen.heightRatio() * this.offsetX1)
//				+ "px "	+ Math.round(-Screen.heightRatio() * frm.y
//						+ Screen.heightRatio() * this.offsetY1) + "px ");
//		if(frm.w && frm.h){
//			this.jObject['css']("background-position", frm.w + "px " + frm.w + "px ");
//		}
	}else{
		var remainder = frame % rowFramesLength;
		var q = (frame - remainder) / rowFramesLength;
		var row = this.animations[this.currentAnimation].row + q;
		frame = remainder;

		this.selectFrame(frame, row);
		
//		this.jObject['css']("background-position", Math.round(-Screen.widthRatio()
//				* frame * this.width + Screen.heightRatio() * this.offsetX1)
//				+ "px "
//				+ Math.round(-Screen.heightRatio() * row * this.height
//						+ Screen.heightRatio() * this.offsetY1) + "px ");
		this.frame = frame;
		this.row = row;
	}
	
//	this.setRealBackgroundPosition();// test
	if (this.frameCallback != null) {
		if (this.frameCallback[this.currentAnimation]) {
			this.frameCallback[this.currentAnimation](this.currentFrame);
		}
	}
	this.currentFrame++;
};

GuiSprite.prototype.stopAnimation = function(dontCallCallback, dontCallJQuery) {
	if (!dontCallJQuery)
		this.jObject['stop']();
	clearInterval(this.updateAnimationCallback);
	this.updateAnimationCallback = null;
	this.currentAnimation = null;
	// this.frameCallback = null;
	if (!dontCallCallback && this.animationEndCallback) {
		// trick with oldCallback is to allow to call setCallback
		// inside callback itself
		var oldCallback = this.animationEndCallback;
		this.animationEndCallback = null;
		oldCallback.call(this);
	}
};

GuiSprite.prototype.remove = function() {
	GuiSprite.parent.remove.call(this);
	clearInterval(this.updateAnimationCallback);
	this.updateAnimationCallback = null;
};

GuiSprite.prototype.setFrameCallback = function(frameCallback) {
	this.frameCallback = frameCallback;
};

GuiSprite.prototype.setAnimationEndCallback = function(animationEndCallback) {
	this.animationEndCallback = animationEndCallback;
};

GuiSprite.prototype.getAnimation = function(animationName) {
	return this.animations[animationName];
};

GuiSprite.prototype.playAnimation = function(animationName, duration, isLooped,
		independentUpdate) {

	var animation = this.animations[animationName];
	assert(animation, "No such animation: " + animationName);

	this.stopAnimation(true);

	this.currentAnimation = animationName;

	this.lastAnimation = animationName;

	var that = this;
	this.currentFrame = 0;
	this.currentFrameTime = 0;
	this.lastUpdateTime = (new Date()).getTime();

	// console.log(this.animations[this.currentAnimation].frameDuration);
	if (duration) {
		this.currentFrameLength = duration / animation.frames.length;
		// console.log("frame lenght " + this.currentFrameLength + ", " +
		// animation.frames.length);
	} else {
		this.currentFrameLength = this.animations[this.currentAnimation].frameDuration;
	}
	this.looped = isLooped;

	if (independentUpdate) {
		this.updateAnimationCallback = setInterval(function() {
			that.updateAnimation();
		}, this.currentFrameLength);
	}
	this.updateAnimation();
};

GuiSprite.prototype.isPlayingAnimation = function(animationName) {
	return this.currentAnimation == animationName;
};

// GuiSprite.prototype.animate = function(moveVector, duration) {
// var that = this;
// this.jObject['animate']({
// left : moveVector.x * Screen.widthRatio() + 'px',
// top : moveVector.y * Screen.heightRatio() + 'px'
// }, {
// duration : duration,
// easing : "linear",
// complete : function() {
// that.stopAnimation();
// // that.x = $("#" + that.id)['css']("left");
// }
// // ,
// // step : function(now, fx) {
// // console.log($("#" + that.id)['css']("left"));
// // }
// });
// };

GuiSprite.prototype.animate = function(animation, callback) {
	var that = this;
	var dx = 0;
	var dy = 0;
	if (animation.x) {
		dx = animation.x - this.x;
	}
	if (animation.y) {
		dy = animation.y - this.y;
	}
	this.spatialAnimation = {
		dx : dx,
		dy : dy,
		duration : animation.duration,
		timeLeft : animation.duration
	};
	if (animation.fade) {
		this.fadeTo(0, animation.duration - 100, function() {
			that.spatialAnimation = null;
			if (callback) {
				callback();
			}
		});
	} else {
		this.spatialAnimation['callback'] = callback;
	}
};

GuiSprite.prototype.flip = function(needToBeFlipped, dontCallTransform) {
	this.flipped = needToBeFlipped;
	if (!dontCallTransform)
		this.transform();
};

GuiSprite.prototype.transform = function(transfromations, dontCallCssTransform) {
	if (transfromations) {
		if (transfromations.matrix != null)
			this.matrix = transfromations.matrix;
		if (transfromations.angle != null)
			this.angle = transfromations.angle;
		if (transfromations.scale != null)
			this.scale = transfromations.scale;
		if (transfromations.translate != null)
			this.translate = transfromations.translate;
	}
	var scaleY = selectValue(this.scale, 1);
	var scaleX = scaleY;
	scaleX *= (this.flipped ? -1 : 1);
	
	if (!dontCallCssTransform)
		cssTransform(this.jObject, this.matrix, this.angle, scaleX, scaleY,
				this.translate);
};

GuiSprite.prototype.rotate = function(angle) {
	this.angle = angle;
	if (this.canvas === null)
		this.transform();
	else
		this.canvas.setAwake(true);
};

GuiSprite.prototype.setTransformOrigin = function(transformOrigin) {
	if (typeof transformOrigin == 'string') {
		this.transformOrigin = transformOrigin;
	} if (transformOrigin && transformOrigin.x && transformOrigin.y) {
		this.transformOrigin = parseInt(transformOrigin.x*100) + "% " + parseInt(transformOrigin.y*100) + "%";
	} else {
		this.transformOrigin = "50% 50%";
	}
	// console.log("Set transform origin to %s", transformOrigin);
	var obj = this.jObject;
	obj['css']("-webkit-transform-origin", this.transformOrigin);
	obj['css']("transform-origin", this.transformOrigin);
	obj['css']("-moz-transform-origin", this.transformOrigin);
	obj['css']("-o-transform-origin", this.transformOrigin);
	obj['css']("transform-origin", this.transformOrigin);
	obj['css']("msTransform-origin", this.transformOrigin);
};

GuiSprite.prototype.setPosition = function(x, y) {
//	if (this.x !== x || this.y !== y) {
		this.x = x;
		this.y = y;

		if (this.viewport) {
			this.clampByViewport();
		} else {
			this.setRealPosition(x, y);
		}
//	}
};

GuiSprite.prototype.setRealPosition = function(x, y) {
	var transObj = {
			translate : {
				x : Math.round(x * Screen.widthRatio()),
				y : Math.round(y * Screen.heightRatio())
			}
	};
	this.transform(transObj);
};

GuiSprite.prototype.setTransform = function(matrix, angle) {
	this.angle = angle;
	this.matrix = matrix;
	this.transform();
};

GuiSprite.prototype.resize = function() {
	GuiSprite.parent.resize.call(this);
	this.setRealBackgroundPosition(this.offsetX1, this.offsetY1);
};

GuiSprite.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	if (offsetY) {
		this.offsetY1 = offsetY;
	}
	if (offsetX) {
		this.offsetX1 = offsetX;
	}
	var frame = selectValue(this.frame, 0);
	var row = selectValue(this.row, 0);
	this.changeBackgroundPositionReal(-frame, row);
//	this.jObject['css']("background-position", Math.round(Screen.widthRatio()
//			* (-frame * this.width + offsetX))
//			+ "px "
//			+ Math.round(Screen.heightRatio() * (row * this.height + offsetY))
//			+ "px ");
};

GuiSprite.prototype.resizeBackground = function() {
	var size = Screen.calcRealSize(this.totalWidth, this.totalHeight);
	this.jObject['css']("background-size", size.x + "px " + size.y + "px");
};

/**
 * usage:
 * var changingColorPairs = [];
 * var pair1 = new ColorRgbChangingPair(new ColorRgb(1, 1, 1), new ColorRgb(2, 2, 2));
 * var pair2 = new ColorRgbChangingPair(new ColorRgb(3, 3, 3), new ColorRgb(4, 4, 4));
 * changingColorPairs.push(pair);
 * changingColorPairs.push(pair2);
 * guiSprite.recolor(changingColorPairs);
 *
 * @param [{ColorRgbChangingPair}] changingColorPairs
 * @return {string} imageUrl
 */
GuiSprite.prototype.recolor = function (changingColorPairs) {
    var image = Resources.getAsset(this.params.totalImage);
    var url = recolorImage(image, changingColorPairs);
    this.setBackgroundFromParams({image: url}, null);
    return url;
};

/**
 *
 * @param {ColorRgbChangingPair} changingColorPair
 * @return {string} imageUrl
 */
GuiSprite.prototype.recolorFullImage = function (changingColorPair) {
    var image = Resources.getAsset(this.params.totalImage);
    var url = recolorFullImage(image, changingColorPair);
    this.setBackgroundFromParams({image: url}, null);
    return url;
};
/**
 * Scene to operate Sprites
 */

/**
 * @constructor
 */
function GuiScene() {
	GuiScene.parent.constructor.call(this);
}

GuiScene.inheritsFrom(GuiDiv);
GuiScene.prototype.className = "GuiScene";

GuiScene.prototype.createInstance = function(params) {
	var entity = new GuiScene(params['parent'], params['style'], params['width'],
			params['height'], params['canvas'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiScene);
/**
 * GuiDialog - modal dialog Has a mask full screen mask over the screen and
 * background image
 */

/**
 * @constructor
 */
function GuiDialog() {
	GuiDialog.parent.constructor.call(this);
};

GuiDialog.inheritsFrom(GuiDiv);
GuiDialog.prototype.className = "GuiDialog";

GuiDialog.prototype.maskDivSoul = null;

GuiDialog.prototype.createInstance = function(params) {
	var entity = new GuiDialog(params['parent'], params['style'], params['width'], params['height'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiDialog);

GuiDialog.prototype.resize = function() {
	GuiDialog.parent.resize.call(this);
	this.children.resize();
};

GuiDialog.prototype.initialize = function(params) {
	GuiDialog.parent.initialize.call(this, params);
	
	this.maskDiv = null;
	this.visible = false;
	

	var that = this;

	// "x" : ((Screen.baseWidth() - this.width) / 2),
	// "y" : ((Screen.baseHeight() - this.height) / 2)

	// an transparent PNG image 1x1 pixel size
	// to prevent clicks
	if (!GuiDialog.prototype.maskDivSoul) {
		GuiDialog.prototype.maskDivSoul = guiFactory.createObject("GuiDiv", {
			"parent" : "body",
			// "image" :
			// "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=",
			"style" : "mask",
			"width" : "FULL_WIDTH",
			"height" : "FULL_HEIGHT",
			"x" : 0,
			"y" : 0
		});
		var tempFunc = GuiDialog.prototype.maskDivSoul.remove;
		GuiDialog.prototype.maskDivSoul.remove = function() {
			GuiDialog.prototype.maskDivSoul = null;
			tempFunc.call(this);
		};
	}
	this.maskDiv = GuiDialog.prototype.maskDivSoul;
//	this.maskDiv.setPosition(this.parent.width/2 - this.maskDiv.width, this.parent.height/2 - this.maskDiv.height);
	this.maskDiv.setBackground("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=");
	this.maskDiv.bind(function(e) {
		e.preventDefault();
		return false;
	});
	this.children.addGui(this.maskDiv);

	this.maskDiv.setZ(130);
	this.setZ(131);
	this.maskDiv.hide();

	// if (this.backSrc) {
	// this.children.addGui(this.backImage =
	// factory.createGuiImage(this.dialogContainer, , "dialogButton",
	// this.width, this.height, 0, 0));
	// }
	this.resize();
};

GuiDialog.prototype.init = function() {
	GuiDialog.parent.init.call(this);
};

GuiDialog.prototype.show = function() {
	GuiDialog.parent.show.call(this);
	if (this.maskDiv) {
		this.maskDiv.resize();
		this.maskDiv.show();
	}
	this.visible = true;
};

GuiDialog.prototype.hide = function() {
	GuiDialog.parent.hide.call(this);
	if (this.maskDiv) {
		this.maskDiv.hide();
	}
	this.visible = false;
};

GuiDialog.prototype.isVisible = function() {
	return this.visible;
};

/**
 * This is canvas class for UltimateJS based on GuiElement.js but not inherit from
 * @author Glukozavr
 * @date April-May 2014
 * @constructor
 */

function GuiCanvas() {
	GuiCanvas.parent.constructor.call(this);
}

GuiCanvas.inheritsFrom(GuiElement);
GuiCanvas.prototype.className = "GuiCanvas";

GuiCanvas.prototype.className = "GuiCanvas";

GuiCanvas.prototype.createInstance = function(params) {
	var entity = new GuiCanvas();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiCanvas);

GuiCanvas.prototype.generate = function(src) {
	assert(this.id, "Id not defined");
	assert(this.style, "Class for object with id = '" + this.id
			+ "' is not defined");
	return "<canvas id=\"" + this.id + "\" class=\"" + this.style
			+ " unselectable\">" + src + "</div>";
};

/**
 * Initial function to save and use incoming params
 * @param params may contain:
 * - parent
 * - width
 * - height
 * - image
 * - offsetX
 * - offsetY
 * - x
 * - y
 * - z
 * - hide
 * - opacity
 */
GuiCanvas.prototype.initialize = function(params) {
	GuiCanvas.parent.initialize.call(this, params);
	this.renderQueue = new Array();
	this.context = this.jObject[0].getContext("2d");
	this.context.imageSmoothingEnabled = false;
	this.context.webkitImageSmoothingEnabled = false;
	this.context.mozImageSmoothingEnabled = false;

	// Creating background pattern for the canvas if image is exist in tha params.
	this.terrainPattern = null;
	if (params.image) {
		var img = Resources.getAsset(params.image);
		this.terrainPattern = this.context.createPattern(img, 'repeat');
	}

	this.setAwake(true);
	Account.instance.addRenderEntity(this);
};

GuiCanvas.prototype.addToRenderQueue = function(elem) {
	assert(elem, "Can`t add 'undefined' to "  + this.id + " render queue");
	this.renderQueue.push(elem);
	this.setAwake(true);
};

GuiCanvas.prototype.removeFromRenderQueue = function(elem) {
	assert(elem, "Can`t remove 'undefined' from "  + this.id + " render queue");
	var idx = this.renderQueue.indexOf(elem);//$.inArray(elem, this.renderQueue);
	if (idx < 0) return;
	this.renderQueue.splice($.inArray(elem, this.renderQueue),1);
	this.setAwake(true);
};

GuiCanvas.prototype.destroy = function() {
	Account.instance.removeRenderEntity(this);
	GuiCanvas.parent.destroy.call(this);
};

GuiCanvas.prototype.setGuiOffset = function(offsetX, offsetY) {
	this.guiOffsetX = this.calcPercentageWidth(offsetX?offsetX:0);
	this.guiOffsetY = this.calcPercentageHeight(offsetY?offsetY:0);
	this.setAwake(true);
};

GuiCanvas.prototype.setPosition = function(x, y) {
	GuiCanvas.parent.setPosition.call(this, x, y);
	this.setAwake(true);
};

/**
 * Sets size of canvas element
 * @param width number or String percent
 * @param height number or String percent
 * @param noResize {Boolean} to disable resize in this function call
 */
GuiCanvas.prototype.setSize = function(width, height, dontResize) {
	GuiCanvas.parent.setSize.call(this, width, height, dontResize);
	this.setAwake(true);
};

/**
 * Changing width and height attr of canvas element
 * @param width {number}
 * @param height {number}
 */
GuiCanvas.prototype.setRealSize = function(width, height) {
	GuiCanvas.parent.setRealSize.call(this, width, height);
	if (!this.context)
		return;
	this.context.canvas.width = this.jObject.width();
	this.context.canvas.height = this.jObject.height();
	this.setAwake(true);
};

/**
 * Changing left and top attr of canvas element
 * @param x {number}
 * @param y {number}
 */
GuiCanvas.prototype.setRealPosition = function(x, y) {
	GuiCanvas.parent.setRealPosition.call(this, x, y);
	this.setAwake(true);
};

/**
 * Total execution of size and positioning changes
 */
GuiCanvas.prototype.resize = function() {
	if (this.params.wrap)
		this.wrapToParentsViewport();
	else
		this.wrapToEnhancedScene();
	GuiCanvas.parent.resize.call(this);
	this.setAwake(true);
};

GuiCanvas.prototype.wrapToParentsViewport = function() {
//	var additionalOffset = {
//			x: -this.parent.width * 0.06,
//			y: 0,
//			width: this.parent.width * 1.18,
//			height: this.parent.height * 0.87 
//	};
//	this.x = additionalOffset.x;
//	this.y = additionalOffset.y;
//	this.width = additionalOffset.width;
//	this.height = additionalOffset.height;
//	
	if(this.parent.viewport) {

		this.x = 0;
		this.y = 0;
		this.width = this.parent.viewRect.width;
		this.height = this.parent.viewRect.height;
	} else {
		this.x = 0;
		this.y = 0;
		this.width = this.parent.width;
		this.height = this.parent.height;
	}
};

GuiCanvas.prototype.wrapToEnhancedScene = function() {
	if (this.parent.parent.parent) {
		this.x = this.parent.parent.parent.x;
		this.y = this.parent.parent.parent.y;
		this.width = this.parent.parent.parent.width;
		this.height = this.parent.parent.parent.height;
	}
};

GuiCanvas.prototype.setAwake = function(awake) {
	var that = this; 
	
	this.awake = true;
	if (this.awakeTimeout)
		clearTimeout(this.awakeTimeout);
	
	this.awakeTimeout = setTimeout(function() {
		that.awake = false;
	}, 500);
};

/**
 * Render of the canvas. draw the background and render children
 */
GuiCanvas.prototype.render = function() {
	if (!this.awake)
		return;
	var w = this.width*Screen.widthRatio();
	var h = this.height*Screen.heightRatio();
	if (this.terrainPattern) {
	    this.context.fillStyle = this.terrainPattern;
	    this.context.fillRect(0, 0, w, h);
	} else {
		this.context.clearRect(0, 0, w, h);
	}

//	this.smartClear();
	for (var i = 0; i < this.renderQueue.length; i++) {
			this.context.save();
			this.renderQueue[i].render(this.context);
			this.context.restore();
	}
};

GuiCanvas.prototype.smartClear = function() {
	for (var i = 0; i < this.renderQueue.length; i++) {
		this.context.save();
		this.renderQueue[i].clear(this.context);
		this.context.restore();
	}
};/**
 * GuiCSprite is a sprite for GuiCanvas (UltimateJS) based on GuiSprite.js but
 * not inherit from
 * 
 * @author Glukozavr
 * @date April-May 2014
 * @constructor
 */
function GuiCSprite() {
	GuiCSprite.parent.constructor.call(this);
}

GuiCSprite.inheritsFrom(GuiSprite);

GuiCSprite.prototype.className = "GuiCSprite";

GuiCSprite.prototype.createInstance = function(params) {
	var entity = new GuiCSprite();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiCSprite);

/**
 * Initial function to save and use incoming params
 * 
 * @param params
 *            may contain: - parent - width - height - image - offsetX - offsetY -
 *            x - y - z - hide - opacity - totalImage, - totalImageWidth, -
 *            totalImageHeight, - totalTile
 */
GuiCSprite.prototype.initialize = function(params) {
	var that = this;
	this.canvasToParentOffset = {
		'left' : 0,
		'top': 0
	};
	this.lastFrame = {
		sourceRect: [0, 0, 0, 0], 
		destRect: [0, 0, 0, 0],
		translate: [0, 0],
		rotate: 0,
		scale: [0, 0]
	};
	this.params = params;
	this.canvas = params['canvas'] ? params['canvas'] : null;

	this.x = this.calcPercentageWidth(params.x||0);
	this.y = this.calcPercentageHeight(params.y||0);

	this.z = params.z||0;

	this.opacity = params.opacity?params.opacity:1;
	this.width = params.width;
	this.height = params.height;
	
	this.parent = params.parent;//.canvas?params.parent.canvas:params.parent;
	this.id = this.generateId();
	
	this.total = {
		image :	params.totalImage,
		width : params.totalImageWidth,
		height : params.totalImageHeight,
		tile : params.totalTile
	};
	
	this.totalWidth = this.total.width;

	this.setOffset(params.offsetX, params.offsetY);

	this.setTransformOrigin(params.transformOrigin);

	this.img = Resources.getImageAsset(this.total.image, function(image) {
		init.call(that, image);
	});


	function init(image) {
//		if (_PIXIJS) {
//			that.pixiSprite = new PIXI.Sprite(new PIXI.Texture(new PIXI.BaseTexture (image), new PIXI.Rectangle(0, 0, that.width, that.height)), that.width, that.height);
//			that.parent.stage.addChild(that.pixiSprite);
//		}
		
		that.imageHeight = Math.round(that.height * image.height / that.total.height);
		that.imageWidth = Math.round(that.width * image.width / that.total.width);
		that.scale = {
				x : Math.round((that.width / that.imageWidth) * 100) / 100,
				y : Math.round((that.height / that.imageHeight) * 100) / 100
		};
		
		that.backgroundPosition = {
			x : 0,
			y : 0
		};
	
		that.backgroundSize = {
				w : that.total.width,
				h : that.total.height
		};
		
		that.rotate(0);
		
		that.resizeBackground();
		
		if (!that.params.hide)
			that.show();
		
		that.setEnable(true);
		Account.instance.addScheduledEntity(that);
	}
	that.imageHeight = Math.round(that.height * that.img.height / that.total.height);
	that.imageWidth = Math.round(that.width * that.img.width / that.total.width);
	
	that.scale = {
			x : Math.round((that.width / that.imageWidth) * 100) / 100,
			y : Math.round((that.height / that.imageHeight) * 100) / 100
	};
	
	this.backgroundPosition = {
		x : 0,
		y : 0
	};

	this.backgroundSize = {
			w : this.total.width,
			h : this.total.height
	};
	
	this.currentAnimation = null;
	this.spatialAnimation = null;
	this.animations = new Object();
	
	if (params['spriteAnimations']) {
		$['each'](params['spriteAnimations'], function(name, value) {
			// console.log("Adding sprite animation " + name);
			that.addSpriteAnimation(name, value);
		});
	}
	
	this.frames = {};
	if(params['frames']){
		this.frames = params['frames']; 
	}
	
	this.resize();
	
	this.parent.addGui(this);
};


GuiCSprite.prototype.updateSpatialAnimation = function(dt) {
	GuiCSprite.parent.updateSpatialAnimation.call(this, dt, true);
};


GuiCSprite.prototype.move = function(dx, dy) {
	this.x += dx;
	this.y += dy;
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.stopAnimation = function(dontCallCallback) {
	GuiCSprite.parent.stopAnimation.call(this, dontCallCallback, true);
};

GuiCSprite.prototype.changeBackgroundPosition = function(x, y) {
	this.backgroundPosition.x = x;
	this.backgroundPosition.y = y;
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.changeBackgroundPositionReal = function(x, y) {
	this.changeBackgroundPosition(x,y);
};

GuiCSprite.prototype.selectFrame = function(frame, row) {
	this.changeBackgroundPosition(frame, row);
};

GuiCSprite.prototype.setFrameCallback = function(frameCallback) {
	this.frameCallback = frameCallback;
};

GuiCSprite.prototype.flip = function(needToBeFlipped) {
	GuiCSprite.parent.flip.call(this, needToBeFlipped, true);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.transform = function(transfromations) {
	GuiCSprite.parent.transform.call(this, transfromations, true);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.setTransformOrigin = function(transformOrigin) {
	this.transformOrigin = {
            x : (transformOrigin && !isNaN(transformOrigin.x))?(Math.round(transformOrigin.x * 100) / 100):0.5,
            y : (transformOrigin && !isNaN(transformOrigin.x))?(Math.round(transformOrigin.y * 100) / 100):0.5
        };
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.setPosition = function(x, y) {
	this.x = this.calcPercentageWidth(x);
	this.y = this.calcPercentageHeight(y);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.setOffset = function(x, y) {
	this.offsetX = this.calcPercentageWidth(x||0);
	this.offsetY = this.calcPercentageHeight(y||0);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.setRealPosition = function(x, y) {
};

GuiCSprite.prototype.setTransform = function(matrix) {
// this.angle = angle;
	this.matrix = matrix;
};

GuiCSprite.prototype.resize = function() {
	var offset = this.parent.jObject['offset']();
	var canvasOffset = this.canvas.jObject['offset']();
	this.canvasToParentOffset.left = offset.left - canvasOffset.left;
	this.canvasToParentOffset.top = offset.top - canvasOffset.top;
};

GuiCSprite.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	GuiCSprite.parent.setRealBackgroundPosition.call(this, offsetX, offsetY);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.resizeBackground = function() {
};

GuiCSprite.prototype.setZ = function(z) {
};

GuiCSprite.prototype.onAdd = function() {
	this.canvas.addToRenderQueue(this);
};

GuiCSprite.prototype.remove = function() {
//	this.canvas.removeFromRenderQueue(this);
	GuiCSprite.parent.remove.call(this);
	Account.instance.removeScheduledEntity(this);
};

GuiCSprite.prototype.hide = function() {
	this.visible = false;
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.show = function() {
	this.visible = true;
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.clampByParentViewport = function() {
};

GuiCSprite.prototype.fadeTo = function(fadeValue, time, callback, changeVisibility) {
// var that = this;

	var fadeAnimation = {};

	fadeAnimation.start = this.opacity;
	fadeAnimation.end = fadeValue>0?(fadeValue<1?fadeValue:1):0;
	
	fadeAnimation.dO = fadeAnimation.end - fadeAnimation.start;

	fadeAnimation.time = time>0?time:500;
	fadeAnimation.speed = Math.abs(fadeAnimation.dO/fadeAnimation.time);

	fadeAnimation.callback = callback;
	fadeAnimation.changeVisibility = changeVisibility;
	
	fadeAnimation.norm = fadeAnimation.dO/Math.abs(fadeAnimation.dO);
	
	this.fadeAnimation = fadeAnimation;
	
	this.fading = true;
};

GuiCSprite.prototype.fade = function(dt) {
	
	var step = this.fadeAnimation.speed * dt * this.fadeAnimation.norm;
	var next = this.opacity + step;
	if ((this.fadeAnimation.end - next)*this.fadeAnimation.norm/Math.abs(this.fadeAnimation.norm) > 0) {
		this.setOpacity(next);
	} else {
		this.fading = false;
		this.setOpacity(this.fadeAnimation.end);
		if (this.fadeAnimation.callback)
			this.fadeAnimation.callback();
		if (this.fadeAnimation.changeVisibility)
			this.hide();
	}
	
};

GuiCSprite.prototype.update = function(dt) {
//	this.convertToPixi();
	
	if (this.fading) {
		this.fade(dt);
	}
};

GuiCSprite.prototype.setOpacity = function(opacity) {
	if (opacity>=0 || opacity<=1) {
		this.opacity = opacity;
	}
};


GuiCSprite.prototype.render = function(ctx) {
	if (!this.visible) 
		return;

	var x = this.canvasToParentOffset.left + (this.x + this.offsetX) * Screen.widthRatio();
    var y = this.canvasToParentOffset.top + (this.y + this.offsetY) * Screen.heightRatio();

	this.lastFrame.destRect[2] = this.width * Screen.widthRatio();
	this.lastFrame.destRect[3] = this.height * Screen.heightRatio();
	this.lastFrame.destRect[0] = -this.lastFrame.destRect[2] * this.transformOrigin.x;
	this.lastFrame.destRect[1] = -this.lastFrame.destRect[3] * this.transformOrigin.y;
	
	this.lastFrame.translate[0] = x - this.lastFrame.destRect[0];
	this.lastFrame.translate[1] = y - this.lastFrame.destRect[1];
	
	this.lastFrame.rotate = this.angle;
	
	ctx.translate(this.lastFrame.translate[0], this.lastFrame.translate[1]);
	ctx.rotate(this.lastFrame.rotate); 
	ctx.globalAlpha = this.opacity;
	
// ctx.scale(this.scale.x, this.scale.y);

	this.lastFrame.sourceRect[0] = this.backgroundPosition.x * this.imageWidth;
	this.lastFrame.sourceRect[1] = this.backgroundPosition.y * this.imageHeight;
	this.lastFrame.sourceRect[2] = this.imageWidth;
	this.lastFrame.sourceRect[3] = this.imageHeight;

	if (this.lastFrame.sourceRect[0] + this.imageWidth <= this.img.width 
			&& this.lastFrame.sourceRect[1] + this.imageHeight <= this.img.height)
	    ctx.drawImage(this.img,
	    		this.lastFrame.sourceRect[0], this.lastFrame.sourceRect[1],
	    		this.lastFrame.sourceRect[2], this.lastFrame.sourceRect[3],
	    		this.lastFrame.destRect[0], this.lastFrame.destRect[1],
	    		this.lastFrame.destRect[2], this.lastFrame.destRect[3]);
	else 
		console.warn('Shit is happining. Again. Source rect is out of image bounds');
};

GuiCSprite.prototype.clear = function(ctx) {
	if (!this.visible) 
		return;
	ctx.translate(this.lastFrame.translate[0], this.lastFrame.translate[1]);
	ctx.rotate(this.lastFrame.rotate); 
	ctx.globalAlpha = this.opacity;
// ctx.scale(1.2, 1.2);

	    ctx.clearRect(this.lastFrame.destRect[0], this.lastFrame.destRect[1],
	    			  this.lastFrame.destRect[2], this.lastFrame.destRect[3]);
};
var UI = {
		"credits" : {
			"creditsDialog": {
				"class" : "GuiDialog",
				"params" : {
					"parent" : "menuContainer",
					"style" : "dialog",
					"width" : 400,
					"height" : 400,
					"x" : "50%",
					"y" : 40,
					"offsetX":-150,
					"hide" : true
				}
			},
			"resume": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "creditsDialog",
					"normal" : {
						"image" : "FinalArt/Menu/Pause/ok.png"			
					},
					"hover" : {
						"image" : "FinalArt/Menu/Pause/ok.png",
						"scale" : 120
					},
					"active" : {
						"image" : "FinalArt/Menu/Pause/ok.png",
						"scale" : 95
					},
					"style" : "dialog",
					"width" : 82,
					"height" : 70,
					"x" : 270,
					"y" : 345
				}
			},
			"scroll" : {
				"class" : "GuiScroll", 
				"params" : {
					"parent" : "creditsDialog", 
				 	"style" : "dialogButton scrollerWrapper", 
					"width" : 340, 
					"height" : 400, 
					"x" : 0, 
					"y" : 20
				}
			},
			"logicking": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "scroll",
					"background" : {
						"image" : "FinalArt/Menu/Main/logicking.png"
					},
					"style" : "scrollButton",
					"width" : 256,
					"height" : 59,
					"x" : 30,
					"y" : 0
				}
			},
			"text": {
				"class" : "GuiLabel",
				"params" : {
					"parent" : "scroll",
					"style" : "scrollButton default-italic",
					"width" : 330,
					"height" : 585,
					"x" : 0,
					"y" : 40,
					"text" : "",
					"fontSize" : 16,
					"color" : "white"
				}
			}
		},
		"GameState" : {
			"enhancedScene": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "#root",
					"style" : "enhancedScene",
					"enhancedScene" : true
				}
			},
			"sceneContainer": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "enhancedScene",
					"style" : "mainScene",
					"innerScene" : true
				}
			},
			"score": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "enhancedScene",
					"normal" : {"image" : "FinalArt/Menu/LevelSelect/ScoreCell001.png",
						"label" : {
							"style" : "gameButton victoriana-normal",
							"text" : "0",
							"fontSize" : 35,
							"color" : "#01B5FF",
							"y" : "48%"
						}},
					"hover" : {"image" : "FinalArt/Menu/LevelSelect/ScoreCell001.png",
								"scale" : 115},
					"style" : "gameButton",
					"width" : 137,
					"height" : 67, 
					"x" : "50%",
					"offsetX" : -69, 
					"y" : 15
				}
			},
			"pauseBtn": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "enhancedScene",
					"normal" : {"image" : "FinalArt/Menu/Pause/Pause1.png"},
					"hover" : {"image" : "FinalArt/Menu/Pause/Pause1.png",
								"scale" : 115},
					"style" : "gameButton",
					"width" : 75,
					"height" : 67, 
					"x" : 10, 
					"y" : 10
				}
			},
			"pauseMenu": {
				"class" : "GuiDialog",
				"params" : {
					"parent" : "enhancedScene",
					"style" : "dialog",
					"width" : 400, 
					"height" : 500,
					"background": {
						"image" : "FinalArt/Menu/Main/Sheet1.png"
					},
					"animations" : {
						"open" : [
									{"animate" : {
										"actions": [["left", "+=", 380]], 
										"time":500
									}},
									{"final" : {
										"x": -20
									}}
						],
						"close" : [
									{"animate" : {
										"actions": [["left", "-=", 400]], 
										"time":500
									}},
									{"final" : {
										"x": -400
									}}
						]
					},
					"x" : -400,
					"y" : "50%",
					"offsetY" : -250
				}
			},
			"levelInfo": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "pauseMenu",
					"normal" : {"image" : "FinalArt/Menu/LevelSelect/NumberCell001.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : "",
										"fontSize" : 30,
										"color" : "#01B5FF",
										"y" : "60%"
									}},
					"hover" : {"image" : "FinalArt/Menu/LevelSelect/NumberCell001.png",
									"scale" : 115,
									"label" : {}},
					"style" : "gameButton",
					"width" : 60,
					"height" : 79, 
					"x" : 75,
					"offsetX" : 150, 
					"y" : 0,
					"offsetY" : 20
				}
			},
			"resume": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "pauseMenu",
					"normal" : {"image" : "FinalArt/Menu/Main/Button1.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : "resume",
										"fontSize" : 25,
										"color" : "#01B5FF",
										"y" : "45%"
									}},
					"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
									"scale" : 115,
									"label" : {}},
					"style" : "gameButton",
					"width" : 210,
					"height" : 67, 
					"x" : 15, 
					"offsetX" : 130,
					"y" : "49%",
					"offsetY" : -131
				}
			},
			"restart": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "pauseMenu",
					"normal" : {"image" : "FinalArt/Menu/Main/Button1.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : "restart",
										"fontSize" : 25,
										"color" : "#01B5FF",
										"y" : "45%"
									}},
					"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
								"scale" : 115,
									"label" : {
									}},
					"style" : "gameButton",
					"width" : 210,
					"height" : 67,  
					"x" : 15, 
					"offsetX" : 130,
					"y" : "49%",
					"offsetY" : -59
				}
			},
			"menu": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "pauseMenu",
					"normal" : {"image" : "FinalArt/Menu/Main/Button1.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : "menu",
										"fontSize" : 25,
										"color" : "#01B5FF",
										"y" : "45%"
									}},
					"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
								"scale" : 115,
									"label" : {
									}},
					"style" : "gameButton",
					"width" : 210,
					"height" : 67, 
					"x" : 15, 
					"offsetX" : 130,
					"y" : "49%",
					"offsetY" : 14
				}
			},
			// "moreGames": {
			// 	"class" : "GuiButton",
			// 	"params" : {
			// 		"parent" : "pauseMenu",
			// 		"normal" : {"image" : "FinalArt/Menu/Main/Button1.png",
			// 						"label" : {
			// 							"style" : "gameButton victoriana-normal",
			// 							"text" : "moreGames",
			// 							"fontSize" : 25,
			// 							"color" : "#01B5FF",
			// 							"y" : "45%"
			// 						}},
			// 		"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
			// 					"scale" : 115,
			// 						"label" : {
			// 						}},
			// 		"style" : "gameButton",
			// 		"width" : 210,
			// 		"height" : 67, 
			// 		"x" : 15, 
			// 		"offsetX" : 130,
			// 		"y" : "49%",
			// 		"offsetY" : 86
			// 	}
			// },
			"soundOn": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "pauseMenu",
					"normal" : {"image" : "FinalArt/Menu/Main/SoundOn.png"},
					"hover" : {"image" : "FinalArt/Menu/Main/SoundOn.png",
								"scale" : 115},
					"style" : "gameButton",
					"width" : 75,
					"height" : 67, 
					"x" : 60, 
					"offsetX" : 150,
					"y" : "100%",
					"offsetY" : -87
				}
			},
			"soundOff": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "pauseMenu",
					"normal" : {"image" : "FinalArt/Menu/Main/SoundOff.png"},
					"hover" : {"image" : "FinalArt/Menu/Main/SoundOff.png",
								"scale" : 115},
					"style" : "gameButton",
					"width" : 75,
					"height" : 67, 
					"x" : 60, 
					"offsetX" : 150,
					"y" : "100%",
					"offsetY" : -87
				}
			},
			"endGameMenu": {
				"class" : "GuiDialog",
				"params" : {
					"parent" : "sceneContainer",
					"background": {
						"image" : "FinalArt/Menu/LevelSelect/Sheet3.png"
					},
					"style" : "dialog",
					"width" : 500, 
					"height" : 280,
					"x" : "18%",
					"y" : 135,
					"z" : 9999
				}
			},
			"endGameMenuLabel": {
				"class" : "GuiLabel",
				"params" : {
					"parent" : "endGameMenu",
					"style" : "gameButton victoriana-white-unboredered",
					"text" : "",
					"fontSize" : 40,
					"y" : "45%",
					"x" : "50%",
					"width" : 500, 
					"height" : 50,
					"offsetX" : -250,
					"offsetY" : -25,
					"align" : "center"
				}
			},			
			"endGameStarDiv": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "endGameMenu",
					"style" : "gameButton",
					"width" : 500, 
					"height" : 64,
					"x" : 0,
					"y" : 15,
					"z" : 9999
				}
			},
			"endGameStar1": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "endGameStarDiv",
					"background": {
						"image" : "FinalArt/Menu/Pause/star.png"
					},
					"style" : "gameButton",
					"width" : 80, 
					"height" : 80,
					"x" : "25%",
					"y" : 0,
					"offsetX" : -40,
					"z" : 9999
				}
			},
			"endGameStar1No": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "endGameStarDiv",
					"background": {
						"image" : "FinalArt/Menu/Pause/starempty.png"
					},
					"style" : "gameButton",
					"width" : 80, 
					"height" : 80,
					"x" : "25%",
					"y" : 0,
					"offsetX" : -40,
					"z" : 9999
				}
			},
			"endGameStar2": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "endGameStarDiv",
					"background": {
						"image" : "FinalArt/Menu/Pause/star.png"
					},
					"style" : "gameButton",
					"width" : 80, 
					"height" : 80,
					"x" : "50%",
					"y" : 0,
					"offsetX" : -40,
					"z" : 9999
				}
			},
			"endGameStar2No": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "endGameStarDiv",
					"background": {
						"image" : "FinalArt/Menu/Pause/starempty.png"
					},
					"style" : "gameButton",
					"width" : 80, 
					"height" : 80,
					"x" : "50%",
					"y" : 0,
					"offsetX" : -40,
					"z" : 9999
				}
			},
			"endGameStar3": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "endGameStarDiv",
					"background": {
						"image" : "FinalArt/Menu/Pause/star.png"
					},
					"style" : "gameButton",
					"width" : 80, 
					"height" : 80,
					"x" : "75%",
					"y" : 0,
					"offsetX" : -40,
					"z" : 9999
				}
			},
			"endGameStar3No": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "endGameStarDiv",
					"background": {
						"image" : "FinalArt/Menu/Pause/starempty.png"
					},
					"style" : "gameButton",
					"width" : 80, 
					"height" : 80,
					"x" : "75%",
					"y" : 0,
					"offsetX" : -40,
					"z" : 9999
				}
			},
			"endMenuBtn": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "endGameMenu",
					"normal" : {"image" : "FinalArt/Menu/Pause/select_level.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : "",
										"fontSize" : 15,
										"color" : "#01B5FF",
										"y" : "45%"
									}},
					"hover" : {"image" : "FinalArt/Menu/Pause/select_level.png",
								"scale" : 115,
									"label" : {
									}},
					"style" : "gameButton",
					"width" : 75,
					"height" : 67, 
					"x" : "25%",
					"offsetX" : -33, 
					"y" : 185
				}
			},
			"endReplyBtn": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "endGameMenu",
					"normal" : {"image" : "FinalArt/Menu/Pause/replay.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : "",
										"fontSize" : 15,
										"color" : "#01B5FF",
										"y" : "45%"
									}},
					"hover" : {"image" : "FinalArt/Menu/Pause/replay.png",
								"scale" : 115,
									"label" : {
									}},
					"style" : "gameButton",
					"width" : 75,
					"height" : 67,   
					"x" : "50%",
					"offsetX" : -33,
					"y" : 185
				}
			},
			"endNextBtn": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "endGameMenu",
					"normal" : {"image" : "FinalArt/Menu/Pause/forward.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : "",
										"fontSize" : 15,
										"color" : "#01B5FF",
										"y" : "45%"
									}},
					"hover" : {"image" : "FinalArt/Menu/Pause/forward.png",
								"scale" : 115,
									"label" : {
									}},
					"style" : "gameButton",
					"width" : 75,
					"height" : 67,   
					"x" : "75%",
					"offsetX" : -33,
					"y" : 185
				}
			},
			"tutorialMenu": {
				"class" : "GuiDialog",
				"params" : {
					"parent" : "sceneContainer",
					"background": {
						"image" : "FinalArt/Menu/LevelSelect/Sheet3.png"
					},
					"style" : "dialog",
					"width" : 450, 
					"height" : 300,
					"x" : "50%",
					"y" : "50%",
					"offsetX" : -225,
					"offsetY" : -150,
					"z" : 9997
				}
			},
			"tutorialMenuLabel": {
				"class" : "GuiLabel",
				"params" : {
					"parent" : "tutorialMenu",
					"style" : "gameButton victoriana-white-unboredered",
					"text" : "take_a_shot",
					"fontSize" : 40,
					"y" : 5,
					"x" : "50%",
					"width" : 440,
					"height" : 80,
					"offsetX" : -220,
					"align" : "center"
				}
			},
			"tutorialFrame_0" : {
				"class" : "GuiSprite",
				"params" : {
					"parent" : "tutorialMenu",
					"width" : 349,
					"style" : "sprite",
					"height" : 200,
					"totalImage" : "FinalArt/Tutorial/shootTutorial.png",
					"totalImageWidth" : 1397,
					"totalImageHeight" : 200,
					"totalTile" : 1,
					"spriteAnimations" : {
						"tutorial" : {
							"frames" : [ 0, 1, 2, 3  ],	"row" : 0 }
					},
					"x" : 10,
					"y" : 70,
					"z" : 9998,
					"hide" : true
				}
			},	
			"tutorialFrame_1" : {
				"class" : "GuiSprite",
				"params" : {
					"parent" : "tutorialMenu",
					"width" : 349,
					"style" : "sprite",
					"height" : 200,
					"totalImage" : "FinalArt/Tutorial/acceleratorTutorial.png",
					"totalImageWidth" : 1047,
					"totalImageHeight" : 200,
					"totalTile" : 1,
					"spriteAnimations" : {
						"tutorial" : {
							"frames" : [ 0, 1, 2 ],	"row" : 0 }
					},
					"x" : 10,
					"y" : 70,
					"z" : 9998,
					"hide" : true
				}
			},		
			"tutorialFrame_2" : {
				"class" : "GuiSprite",
				"params" : {
					"parent" : "tutorialMenu",
					"width" : 349,
					"style" : "sprite",
					"height" : 200,
					"totalImage" : "FinalArt/Tutorial/bombTutorial.png",
					"totalImageWidth" : 1047,
					"totalImageHeight" : 200,
					"totalTile" : 1,
					"spriteAnimations" : {
						"tutorial" : {
							"frames" : [ 0, 1, 2 ],	"row" : 0 }
					},
					"x" : 10,
					"y" : 70,
					"z" : 9998,
					"hide" : true
				}
			},	
			"tutorialFrame_3" : {
				"class" : "GuiSprite",
				"params" : {
					"parent" : "tutorialMenu",
					"width" : 349,
					"style" : "sprite",
					"height" : 200,
					"totalImage" : "FinalArt/Tutorial/bomberTutorial.png",
					"totalImageWidth" : 1047,
					"totalImageHeight" : 200,
					"totalTile" : 1,
					"spriteAnimations" : {
						"tutorial" : {
							"frames" : [ 0, 1, 2 ],	"row" : 0 }
					},
					"x" : 10,
					"y" : 70,
					"z" : 9998,
					"hide" : true
				}
			},	
			"tutorialFrame_4" : {
				"class" : "GuiSprite",
				"params" : {
					"parent" : "tutorialMenu",
					"width" : 349,
					"style" : "sprite",
					"height" : 200,
					"totalImage" : "FinalArt/Tutorial/doubleTutorial.png",
					"totalImageWidth" : 1047,
					"totalImageHeight" : 200,
					"totalTile" : 1,
					"spriteAnimations" : {
						"tutorial" : {
							"frames" : [ 0, 1, 2 ],	"row" : 0 }
					},
					"x" : 10,
					"y" : 70,
					"z" : 9998,
					"hide" : true
				}
			},	
			"tutorialFrame_5" : {
				"class" : "GuiSprite",
				"params" : {
					"parent" : "tutorialMenu",
					"width" : 349,
					"style" : "sprite",
					"height" : 200,
					"totalImage" : "FinalArt/Tutorial/boomerangTutorial.png",
					"totalImageWidth" : 1047,
					"totalImageHeight" : 200,
					"totalTile" : 1,
					"spriteAnimations" : {
						"tutorial" : {
							"frames" : [ 0, 1, 2 ],	"row" : 0 }
					},
					"x" : 10,
					"y" : 70,
					"z" : 9998,
					"hide" : true
				}
			},	
			"tutorialNext": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "tutorialMenu",
					"normal" : {"image" : "FinalArt/Menu/Pause/forward.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : "",
										"fontSize" : 20,
										"color" : "#01B5FF",
										"y" : "45%"
									}},
					"hover" : {"image" : "FinalArt/Menu/Pause/forward.png",
								"scale" : 115,
									"label" : {
									}},
					"style" : "gameButton",
					"width" : 75,
					"height" : 67, 
					"x" : "100%", 
					"y" : "100%",
					"offsetX" : -95,
					"offsetY" : -87,
					"z" : 9999
				}
			},
			"tutorialEnd": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "tutorialMenu",
					"normal" : {"image" : "FinalArt/Menu/Pause/ok.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : "",
										"fontSize" : 20,
										"color" : "#01B5FF",
										"y" : "45%"
									}},
					"hover" : {"image" : "FinalArt/Menu/Pause/ok.png",
								"scale" : 115,
									"label" : {
									}},
					"style" : "gameButton",
					"width" : 75,
					"height" : 67, 
					"x" : "100%", 
					"y" : "100%",
					"offsetX" : -85,
					"offsetY" : -77,
					"z" : 9999
				}
			}
		},
		"LevelMenu" : {
			"enhancedScene": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "#root",
					"background": {
						"image" : "FinalArt/Backgrounds/background_new.jpg"
					},
					"style" : "enhancedScene",
					"enhancedScene" : true
				}
			},
			"menuContainer": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "enhancedScene",
					"style" : "mainScene",
					"innerScene" : true
				}
			},
			"score": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "menuContainer",
					"normal" : {"image" : "FinalArt/Menu/LevelSelect/ScoreCell001.png",
						"label" : {
							"style" : "gameButton victoriana-normal",
							"text" : "",
							"fontSize" : 30,
							"y" : "45%",
							"color" : "#01B5FF"
						}},
					"hover" : {"image" : "FinalArt/Menu/LevelSelect/ScoreCell001.png",
								"scale" : 115},
					"style" : "gameButton",
					"width" : 137,
					"height" : 67, 
					"x" : "100%", 
					"y" : 420,
					"offsetX" : -167
				}
			},
			"menu": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "menuContainer",
					"normal" : {"image" : "FinalArt/Menu/Main/Button1.png",
						"label" : {
							"style" : "gameButton victoriana-normal",
							"text" : "menu",
							"fontSize" : 30,
							"y" : "45%",
							"color" : "#01B5FF"
						}},
					"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
								"scale" : 115,
						"label" : {
							"style" : "gameButton victoriana-normal",
							"text" : "menu",
							"y" : "45%",
							"fontSize" : 30,
							"color" : "#01B5FF"
						}},
					"style" : "gameButton",
					"width" : 137,
					"height" : 67, 
					"x" : 0, 
					"y" : 420,
					"offsetX" : 30
				}
			}
		},
		"mainMenu" : {
			"enhancedScene": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "#root",
					"background": {
						"image" : "FinalArt/Menu/Main/zastavka.jpg"
					},
					"hide" : true,
					"style" : "enhancedScene",
					"enhancedScene" : true
				}
			},
			"menuContainer": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "enhancedScene",
					"style" : "mainScene",
					"innerScene" : true
				}
			},
			"play": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "menuContainer",
					"normal" : {
						"image" : "FinalArt/Menu/Main/Button1.png",
						"label" : {
							"style" : "gameButton victoriana-normal",
							"text" : "play",
							"fontSize" : 35,
							"y" : "45%",
							"color" : "#753424"
						}
					},
					"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
								"scale" : 115,
						"label" : {
						}},
					"style" : "gameButton",
					"width" : 250,
					"height" : 67, 
					"x" : "50%",
					"offsetX" : -125, 
					"y" : 200
				}
			},
			"fullScreen": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "enhancedScene",
					"normal" : {
						"image" : "FinalArt/Menu/Main/Button1.png",
						"label" : {
							"style" : "gameButton victoriana-normal",
							"text" : "fullScreen",
							"fontSize" : 25,
							"y" : "45%",
							"color" : "#753424"
						}
					},
					"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
								"scale" : 115,
						"label" : {
						}},
					"style" : "gameButton",
					"width" : 250,
					"height" : 67, 
					"x" : "100%",
					"offsetX" : -270, 
					"y" : "0%",
					"offsetY" : 20
				}
			},
			"highscores": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "menuContainer",
					"normal" : {"image" : "FinalArt/Menu/Main/Button1.png",
						"label" : {
							"style" : "gameButton victoriana-normal",
							"text" : "Scores",
							"fontSize" : 35,
							"color" : "#01B5FF",
							"y" : "45%",
						}},
					"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
								"scale" : 115,
						"label" : {
						}},
					"style" : "gameButton",
					"width" : 219,
					"height" : 82, 
					"x" : 325, 
					"y" : 380,
					"hide" : true
				}
			},
			"clDiv": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "menuContainer",
					"style" : "gameButton",
					"width" : 307,
					"height" : 67,
					"x" : "50%",
					"offsetX" : -153, 
					"y" : 275
				}
			},
			// "changeLang": {
			// 	"class" : "GuiButton",
			// 	"params" : {
			// 		"parent" : "clDiv",
			// 		"normal" : {
			// 			"image" : "FinalArt/Menu/Main/Button1.png",
			// 			"label" : {
			// 				"style" : "gameButton victoriana-normal",
			// 				"text" : "language",
			// 				"y" : "45%",
			// 				"fontSize" : 35,
			// 				"color" : "#753424"
			// 			}
			// 		},
			// 		"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
			// 					"scale" : 105,
			// 			"label" : {
			// 			}},
			// 		"style" : "gameButton",
			// 		"width" : 200,
			// 		"height" : 67, 
			// 		"x" : 107,
			// 		"y" : 0
			// 	}
			// },
			// "mainFlag": {
			// 	"class" : "GuiDiv",
			// 	"params" : {
			// 		"parent" : "clDiv",
			// 		"background": {
			// 			"image" : "United_Kingdom.png"
			// 		},
			// 		"style" : "gameButton",
			// 		"width" : 92,
			// 		"height" : 67,
			// 		"x" : 0,
			// 		"y" : 0,
			// 		"offsetY" : 0
			// 	}
			// },
			// "moreGames": {
			// 	"class" : "GuiButton",
			// 	"params" : {
			// 		"parent" : "menuContainer",
			// 		"normal" : {
			// 			"image" : "FinalArt/Menu/Main/Button1.png",
			// 			"label" : {
			// 				"style" : "gameButton victoriana-normal",
			// 				"text" : "moreGames",
			// 				"fontSize" : 30,
			// 				"y" : "45%",
			// 				"color" : "#753424"
			// 			}
			// 		},
			// 		"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
			// 					"scale" : 115,
			// 			"label" : {
			// 			}},
			// 		"style" : "gameButton",
			// 		"width" : 250,
			// 		"height" : 67, 
			// 		"x" : "50%",
			// 		"offsetX" : -125, 
			// 		"y" : 350
			// 	}
			// },
			// "help": {
			// 	"class" : "GuiButton",
			// 	"params" : {
			// 		"parent" : "menuContainer",
			// 		"normal" : {"image" : "FinalArt/Menu/Main/FAQ.png"},
			// 		"hover" : {"image" : "FinalArt/Menu/Main/FAQ.png",
			// 					"scale" : 115},
			// 		"style" : "gameButton",
			// 		"width" : 75,
			// 		"height" : 67,   
			// 		"x" : "50%",
			// 		"offsetX" : -85,
			// 		"y" : 424
			// 	}
			// },
			// "soundOn": {
			// 	"class" : "GuiButton",
			// 	"params" : {
			// 		"parent" : "menuContainer",
			// 		"normal" : {"image" : "FinalArt/Menu/Main/SoundOn.png"},
			// 		"hover" : {"image" : "FinalArt/Menu/Main/SoundOn.png",
			// 					"scale" : 115},
			// 		"style" : "gameButton",
			// 		"width" : 75,
			// 		"height" : 67,  
			// 		"x" : "50%",
			// 		"offsetX" : 10,
			// 		"y" : 424
			// 	}
			// },
			// "soundOff": {
			// 	"class" : "GuiButton",
			// 	"params" : {
			// 		"parent" : "menuContainer",
			// 		"normal" : {"image" : "FinalArt/Menu/Main/SoundOff.png"},
			// 		"hover" : {"image" : "FinalArt/Menu/Main/SoundOff.png",
			// 					"scale" : 115},
			// 		"style" : "gameButton",
			// 		"width" : 75,
			// 		"height" : 67,  
			// 		"x" : "50%",
			// 		"offsetX" : 10,
			// 		"y" : 424
			// 	}
			// },
			// "dialogLanguage": {
			// 	"class" : "GuiDialog",
			// 	"params" : {
			// 		"parent" : "menuContainer",
			// 		"style" : "dialog",
			// 		"width" : 500,
			// 		"height" : 400,
			// 		"x" : "50%",
			// 		"y" : "50%",
			// 		"offsetX" : -250,
			// 		"offsetY" : -200,
			// 		"hide": true
			// 	}
			// },
			// "changeLangSheet": {
			// 	"class" : "GuiDiv",
			// 	"params" : {
			// 		"parent" : "dialogLanguage",
			// 		"background": {
			// 			"image" : "FinalArt/Menu/Main/Sheet1.png"
			// 		},
			// 		"style" : "dialog",
			// 		"width" : 447,
			// 		"height" : 441,
			// 		"x" : "50%",
			// 		"y" : "50%",
			// 		"offsetX" : -223,
			// 		"offsetY" : -220
			// 	}
			// },
			// "langScroll" : {
			// 	"class" : "GuiScroll", 
			// 	"params" : {
			// 		"parent" : "changeLangSheet", 
			// 	 	"style" : "dialogButton scrollerWrapper", 
			// 		"width" : 400,
			// 		"height" : 300,
			// 		"vScroll" : true,
			// 		"hScroll" : false,
			// 		"x" : "50%", 
			// 		"offsetX" : -200,
			// 		"y" : 10
			// 	}
			// },
			// "langBack": {
			// 	"class" : "GuiButton",
			// 	"params" : {
			// 		"parent" : "changeLangSheet",
			// 		"normal" : {
			// 			"image" : "FinalArt/Menu/Main/Button1.png",
			// 			"label" : {
			// 				"style" : "gameButton victoriana-normal",
			// 				"text" : "back",
			// 				"fontSize" : 35,
			// 				"y" : "45%",
			// 				"color" : "#753424"
			// 			}
			// 		},
			// 		"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
			// 					"scale" : 115,
			// 			"label" : {
			// 			}},
			// 		"style" : "dialog",
			// 		"width" : 250,
			// 		"height" : 67, 
			// 		"x" : "50%",
			// 		"offsetX" : -125,
			// 		"y" : "100%",
			// 		"offsetY" : -100
			// 	}
			// }
		}
};var EFFECTS = {
		"BallExplosion" : {
			"class" : "Effect",
			"type" : "justExplosion_1",
			"parent" : "Scene01"
		},
		"eggExplosion" : {
			"class" : "Effect",
			"type" : "justExplosion_1",
			"parent" : "Scene01"
		},
		"casualExplosion" : {
			"class" : "Effect",
			"type" : "casualExplosion_1",
			"parent" : "Scene01"
		},
		"bombExplosion" : {
			"class" : "Effect",
			"type" : "bombExplosion_1",
			"parent" : "Scene01"
		},
		"bomberExplosion" : {
			"class" : "Effect",
			"type" : "bomberExplosion_1",
			"parent" : "Scene01"
		},
		"acceleratorExplosion" : {
			"class" : "Effect",
			"type" : "acceleratorExplosion_1",
			"parent" : "Scene01"
		},
		"tripleExplosion" : {
			"class" : "Effect",
			"type" : "tripleExplosion_1",
			"parent" : "Scene01"
		},
		"birdsExplosion" : {
			"class" : "Effect",
			"type" : "tripleExplosion_1",
			"parent" : "Scene01"
		},
		"boomerangExplosion" : {
			"class" : "Effect",
			"type" : "boomerangExplosion_1",
			"parent" : "Scene01"
		},
		"BigBlockDestruction" : {
			"class" : "Effect",
			"type" : "BigBlockDestruction",
			"parent" : "Scene01"
		},
		"SmallBlockDestruction" : {
			"class" : "Effect",
			"type" : "SmallBlockDestruction",
			"parent" : "Scene01"
		}
};var _LEVELS = [
//0
{"Block.0":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":608.3149060957026,"y":246.18575549015736,"angle":1.5707963267948966},"Block.1":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":681.4963629906696,"y":356.2411784027084,"angle":1.5707963267948966},"Block.2":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":592.9153141268121,"y":355.0536970230229,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":636.1080886930447,"y":302.1444826898753,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":665.9148644859123,"y":246.04688148490126,"angle":1.5707963267948966},"Block.5":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":636.2222585801967,"y":190.70404880956048,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":638.1277117550158,"y":279.57222187042635,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["casual","casual"]}},
//1
{"Block.0":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":510.06575891729847,"y":357.25376076297715,"angle":1.5707963267948966},"Block.1":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":588.7574132784507,"y":357.1944732631878,"angle":1.5707963267948966},"Block.2":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":548.3465181286265,"y":301.73497005329517,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"WoodBox","x":612.0652360999059,"y":391.23933715104494,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"WoodBox","x":548.7772199075395,"y":331.58629629639535,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":573.9089330290573,"y":357.19679700145934,"angle":1.5707963267948966},"Block.6":{"class":"Block","parent":"Scene01","type":"WoodBox","x":612.1306195545275,"y":363.37761994800974,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"WoodBox","x":612.2684558799039,"y":335.5282470064468,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"WoodBox","x":487.53160947740446,"y":323.93297602185373,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"WoodBox","x":612.3950506155654,"y":307.6785899820665,"angle":0},"Block.10":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":525.3075724318134,"y":357.25541510489455,"angle":1.5707963267948966},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":549.9716137420185,"y":361.4396680016446,"angle":0},"Block.11":{"class":"Block","parent":"Scene01","type":"WoodBox","x":549.9976645040589,"y":391.2896680005588,"angle":0},"Block.12":{"class":"Block","parent":"Scene01","type":"BigBlock_3","x":479.375,"y":385,"angle":0},"Block.13":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":482.5,"y":355,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["bomb","bomb"]}},
//2
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigColumn","x":515.9303199706417,"y":398.1499851168674,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":489.0007614216134,"y":375.73763542707286,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":461.437071623482,"y":357.3388203004917,"angle":1.5707963267948966},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["boomerang","boomerang"]}},
//3
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":482.7411558156448,"y":375.59920023310855,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigColumn","x":503.8751934393416,"y":398.45769067383003,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"BigColumn","x":558.5064632368391,"y":357.67739954394824,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"BigColumn","x":447.8945301516582,"y":357.67991201991003,"angle":1.5707963267948966},"Block.4":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":522.1591307775069,"y":375.59997478398134,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"BigColumn","x":613.1853010913258,"y":398.4505033219165,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":590.40343350675,"y":375.5923887604436,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"BigColumn","x":503.58206751940355,"y":320.89637161140973,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":482.29935906212125,"y":343.74920010625397,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":522.1515544670862,"y":343.74997467557733,"angle":0},"Block.10":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":591.0364261075013,"y":343.74239117795287,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":630.65691391347,"y":375.6005510233502,"angle":0},"Block.11":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":668.75,"y":357.5,"angle":1.5707963267948966},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["bomb","bomb"]}},
//4
{"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":538.6025738309409,"y":324.60199425883826,"angle":0},"Block.0":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":537.5026312786192,"y":389.2946969383518,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":535.5886664287691,"y":357.44597419630736,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":535.5496065073813,"y":291.7593458626237,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":534.2279361081233,"y":259.91234509067397,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":534.9967441124335,"y":228.06507598801406,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":533.8618340593223,"y":195.22028855626465,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":531.8111426279692,"y":156.65878129927628,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":531.1512313699068,"y":124.1847513746589,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["accelerator","accelerator","accelerator"]}},
//5
{"Block.0":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":644.0489391157886,"y":247.90111250884564,"angle":1.5707963267948966},"Block.1":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":610.5781908448683,"y":192.4761487000052,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":577.3247205287776,"y":247.94613526862253,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"BigColumn","x":611.4158571101631,"y":302.78856428167245,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"BigColumn","x":575.7446648602948,"y":357.3990543579235,"angle":1.5707963267948966},"Block.5":{"class":"Block","parent":"Scene01","type":"BigColumn","x":647.4442955551677,"y":357.38871303226387,"angle":1.5707963267948966},"Block.6":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":430.15198572504534,"y":301.79734967083726,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":466.1442059610955,"y":357.14755558612836,"angle":1.5707963267948966},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":612.2545829325877,"y":280.4382300981223,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":433.125,"y":389.5722222222225,"angle":0},"Soldier.2":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":612.0883383383384,"y":389.51784185382456,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":395.2952952952953,"y":356.4102564102564,"angle":1.5707963267948966},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["casual","casual","casual","casual","casual"]}},
//6
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":569.6876582539471,"y":357.39830427112133,"angle":1.5707963267948966},"Block.1":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":561.1829008582387,"y":236.50040633037668,"angle":1.5707963267948966},"Block.2":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":627.0467072761567,"y":357.40003384444674,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":598.6482227521242,"y":291.0230072791345,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":558.6181165741898,"y":303.878914886029,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":633.1792443898772,"y":303.7927024029009,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":596.9806014798717,"y":268.6768848800532,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":376.4780691624324,"y":354.63882298559696,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":361.01183719843056,"y":331.8112095458384,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":351.86924696833654,"y":367.39313944271515,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":403.4779939427702,"y":389.15082346022916,"angle":0},"Block.10":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":348.39097974876654,"y":389.15114805945205,"angle":0},"Block.11":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":400.677858559113,"y":367.3671723388166,"angle":0},"Block.12":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":361.417398295743,"y":308.96158824572063,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":396.0723921822373,"y":332.2636716995074,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["accelerator","accelerator","accelerator"]}},
//7
{"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":589.6707891699634,"y":170.57547557070836,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":521.6085550991589,"y":279.68777579564573,"angle":0},"Block.0":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":604.7016784269254,"y":193.43295178465493,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":508.11923647874966,"y":302.5840475079523,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":487.3803059466522,"y":357.28259897272045,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":603.5264569308945,"y":302.66625410493606,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":582.8538461319449,"y":248.05852710613092,"angle":1.5707963267948966},"Block.5":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":557.3674422900608,"y":357.30881277794447,"angle":1.5707963267948966},"Block.6":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":636.7844922136476,"y":357.3924730308998,"angle":1.5707963267948966},"Block.7":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":635.7010127219146,"y":248.0338998832101,"angle":1.5707963267948966},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["accelerator","accelerator","accelerator"]}},
//8
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigBlock_3","x":657.1129741715949,"y":324.9881378158589,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":658.0402325011927,"y":388.99569926548395,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"BigBlock_3","x":657.5033656186955,"y":356.99207873346194,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":575.0681326361573,"y":388.99542420527814,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":489.34530523742643,"y":388.9956959321965,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":575.5439189536728,"y":356.99117973973176,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":488.60146571582334,"y":355.99160427193783,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":576.0324797515073,"y":323.9866141615555,"angle":0},"Soldier.2":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":657.4334665653206,"y":291.9836224465701,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["triple","triple","triple"]}},
//9
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":567.576923015197,"y":389.0032018244783,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":643.7542436263383,"y":389.0003345598567,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"WoodPlankThin","x":604.1917775829165,"y":370.5107583599764,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"WoodPlankThin","x":600.9991592372543,"y":333.549876153495,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":602.1569397719896,"y":352.0345788372918,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":710.6394477481181,"y":352.04846894511854,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"WoodPlankThin","x":711.2060833941542,"y":333.5682715394675,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":708.0766804322353,"y":315.089308042436,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":711.0106758562265,"y":389.007999672143,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"WoodPlankThin","x":709.9275855611228,"y":296.61012486647815,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":600.0548499987885,"y":315.0548453876823,"angle":0},"Block.10":{"class":"Block","parent":"Scene01","type":"WoodPlankThin","x":710.9257895171102,"y":370.5272499042723,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":707.5181478841637,"y":278.13380847701785,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["accelerator","accelerator","accelerator"]}},
//10
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":568.5441263572752,"y":356.66220417272166,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigBlock_3","x":568.3697561037192,"y":324.80075802717766,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":529.1828467502481,"y":388.5140766394501,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":489.78826122761075,"y":356.6465615955024,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":488.2358658567888,"y":324.7979844957092,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":529.1928548913309,"y":356.6640526108935,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":489.8327304353501,"y":388.5116556676461,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":568.5334731773977,"y":388.5128091990937,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":450.45956997625944,"y":388.52424705657165,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":449.8852165387493,"y":356.6742619860624,"angle":0},"Block.10":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":608.1696485529325,"y":356.6749999999986,"angle":0},"Block.11":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":607.9207912898113,"y":388.52499999999895,"angle":0},"Block.12":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":410.37589488115145,"y":356.67499999995147,"angle":0},"Block.13":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":411.07952887777424,"y":388.52499999995524,"angle":0},"Block.14":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":648.1246305496179,"y":388.5250000000002,"angle":0},"Block.15":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":648.1218410101252,"y":356.6750000000006,"angle":0},"Block.16":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":409.3166018281338,"y":324.8249999999513,"angle":0},"Block.17":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":646.2448195979672,"y":324.82500000000095,"angle":0},"Block.18":{"class":"Block","parent":"Scene01","type":"WoodPlankThin","x":608.75,"y":306.25,"angle":0},"Block.19":{"class":"Block","parent":"Scene01","type":"WoodPlankThin","x":448.125,"y":306.875,"angle":0},"Block.20":{"class":"Block","parent":"Scene01","type":"WoodPlankThin","x":527.5,"y":306.875,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":529.375,"y":323.125,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":451.25,"y":326.25,"angle":0},"Soldier.2":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":606.875,"y":325.625,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["bomber","bomber"]}},
//11
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":571.673957135352,"y":357.53659806167843,"angle":1.5707963267948966},"Block.1":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":598.8186223190677,"y":389.4206311545668,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":599.1665388047,"y":323.6430848080454,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":601.1818446064542,"y":300.1786644096599,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":600.4526865932562,"y":356.5128375482756,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":557.209457808019,"y":357.01574074074074,"angle":1.5707963267948966},"Block.5":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":470.625,"y":360.14074074074074,"angle":1.5707963267948966},"Block.6":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":529.3749792752358,"y":325.38623150335485,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":530,"y":357.6333333333333,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":530.9813252770894,"y":390.1333333333333,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":494.375,"y":393.125,"angle":0},"Soldier.2":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":528.75,"y":295,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["bomb","triple","triple","boomerang"]}},
//12
{"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":605.5442942942952,"y":389.65000000000026,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":556.7942942942952,"y":389.65000000000026,"angle":0},"Soldier.2":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":401.016016016016,"y":390.4512820512823,"angle":0},"Soldier.3":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":447.891016016016,"y":390.4512820512823,"angle":0},"Block.0":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":348.516016016016,"y":389.95128205128236,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":503.66929429429484,"y":389.1500000000003,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":658.0442942942952,"y":389.1500000000003,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["triple","triple","triple"]}},
//13
{"Block.0":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":455.71399400952987,"y":388.4821229450624,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":454.5866831184686,"y":356.6320625786885,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":452.68535914685435,"y":324.76811811607615,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":453.3754629361847,"y":292.8717376967957,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":453.0767220607248,"y":261.02173777859474,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":495.0676606147141,"y":388.48222450622245,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":493.9920116265017,"y":356.6322179592968,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":492.0756718611751,"y":324.7821999928688,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":534.4181906799929,"y":356.62841322678986,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":533.5846093502893,"y":324.77841326671745,"angle":0},"Block.10":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":574.2494527126161,"y":388.4820294345702,"angle":0},"Block.11":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":534.4571575112215,"y":388.4820350181905,"angle":0},"Block.12":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":615.3790197045687,"y":388.4828346470555,"angle":0},"Block.13":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":493.70976742232904,"y":292.932200287323,"angle":0},"Block.14":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":573.8070566216782,"y":356.626251214224,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":494.4880251109778,"y":260.0821996572937,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":613.8456204309646,"y":355.6328398835443,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["boomerang","boomerang","boomerang","boomerang"]}},
//14
{"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":527.5,"y":388.665740740741,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":431.875,"y":388.665740740741,"angle":0},"Block.0":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":403.1237548606583,"y":356.80575928224533,"angle":1.5707963267948966},"Block.1":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":462.4987548606583,"y":356.80575928224533,"angle":1.5707963267948966},"Block.2":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":499.3745283499111,"y":356.91416705204574,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":556.8720899211473,"y":356.91457204983703,"angle":1.5707963267948966},"Block.4":{"class":"Block","parent":"Scene01","type":"BigColumn","x":431.875,"y":301.39074074074074,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"BigColumn","x":526.25,"y":300.76574074074074,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["casual", "bomber","bomber","bomber"]}},
//15
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":566.400383832828,"y":357.5353245544333,"angle":1.5707963267948966},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":591.2356177575616,"y":89.0077807659662,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":566.0420523748236,"y":262.179988409174,"angle":1.5707963267948966},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":538.5516632317717,"y":89.41888171088078,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":565.0321886389593,"y":112.05661675285418,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":565.6942643544679,"y":166.69343000685734,"angle":1.5707963267948966},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["triple","triple"]}},
//16
{"Block.0":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":404.43313323474433,"y":381.4564277257129,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":378.7613903186948,"y":394.8368681074821,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":474.61827567025364,"y":394.84058067638955,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":448.98042121649485,"y":381.5057689049331,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":498.36056303947294,"y":381.5054631704187,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":474.4508909278919,"y":368.1791019697317,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":570.4759736305555,"y":394.85387283286195,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":545.2958677362456,"y":381.47337614646295,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":595.5087992507238,"y":381.55889562519377,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":570.3179037671384,"y":368.1940958281762,"angle":0},"Block.10":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":595.1774985324544,"y":354.9726617960474,"angle":0},"Block.11":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":473.2948797760548,"y":354.89143781544715,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":474.8183270703162,"y":333.0770693630123,"angle":0},"Block.12":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":378.564048459747,"y":368.16941768737837,"angle":0},"Block.13":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":353.75156227569414,"y":381.5472107913526,"angle":0},"Block.14":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":352.49967656263755,"y":354.96925170680953,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":353.125,"y":333.1604055634613,"angle":0},"Soldier.2":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":595,"y":333.17207228113494,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["bomber","bomber"]}},
//17
{"Block.0":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":408.75457914901136,"y":389.28833774006785,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":495.0047299235325,"y":389.2840788607976,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":396.8058423998606,"y":325.6837222096687,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":508.762462300507,"y":325.62833845421846,"angle":1.5707963267948966},"Block.4":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":397.41171811535827,"y":230.33214013546646,"angle":1.5707963267948966},"Block.5":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":508.14833828990345,"y":230.27648940584848,"angle":1.5707963267948966},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":453.75,"y":390.625,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["bomb","bomb"]}},
//18
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":435.62839840849523,"y":357.3365311869863,"angle":1.5707963267948966},"Block.1":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":473.3245845060229,"y":302.49220553701707,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":432.7476823755656,"y":248.09278409524282,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":472.4178464965687,"y":193.26585342584053,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":514.8799317613275,"y":357.1370830251908,"angle":1.5707963267948966},"Block.5":{"class":"Block","parent":"Scene01","type":"BigColumn","x":514.9349505380497,"y":247.6513837327471,"angle":1.5707963267948966},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":474.9648818086402,"y":279.6325464756137,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":473.125,"y":389.15000000000026,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":380.13060590026885,"y":353.7999994064201,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":353.5517474188857,"y":383.1499999432705,"angle":1.5707963267948966},"Block.8":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":422.3423727939685,"y":383.1499993763226,"angle":1.5707963267948966},"Soldier.2":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":384.375,"y":389.15000000000026,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":341.2509627384591,"y":383.1499999823877,"angle":1.5707963267948966},"Block.10":{"class":"Block","parent":"Scene01","type":"WoodPlankSmall","x":409.37457336818517,"y":383.1499994713515,"angle":1.5707963267948966},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["bomber","boomerang","bomb"]}},
//19
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":545.9334707123047,"y":302.9235583260667,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":587.4011141041339,"y":357.6193621134177,"angle":1.5464952000574164},"Block.2":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":546.5926659900218,"y":289.09177047055505,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":546.0437081655125,"y":275.26055558175847,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":544.9321625301031,"y":261.42705782188443,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":545.1852785525167,"y":247.5910951449307,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":544.4487723652012,"y":138.3955671566917,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":543.8196857866551,"y":124.54781506961241,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":586.3342592806836,"y":192.988741494076,"angle":1.5707963267948966},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":556.8715600810261,"y":389.540740740741,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"BigColumn","x":505.625,"y":192.5,"angle":1.5707963267948966},"Block.10":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":508.75,"y":357.5,"angle":1.5707963267948966},"Block.11":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":522.5,"y":357.5,"angle":1.5707963267948966},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":547.5,"y":225.625,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["bomb","bomb"]}},
//20
{"Block.0":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":649.1347597597596,"y":389.1500000000003,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":691.0097597597596,"y":389.65000000000026,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":489.7597597597596,"y":389.65000000000026,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":449.1347597597596,"y":389.016413152161,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["accelerator","accelerator"]}},
//21
{"Block.0":{"class":"Block","parent":"Scene01","type":"SmallColumn","x":457.8631236842963,"y":302.9072082191563,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigColumn","x":484.2638625788776,"y":356.14665848682006,"angle":1.5707963267948966},"Block.2":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":435,"y":357.5,"angle":1.5707963267948966},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":457.5,"y":285,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":435,"y":250.625,"angle":1.5707963267948966},"Block.4":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":482.5,"y":251.25,"angle":1.5707963267948966},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":458.75,"y":246.25,"angle":0},"Soldier.2":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":458.75,"y":207.5,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["boomerang","boomerang"]}},
//22
{"Block.0":{"class":"Block","parent":"Scene01","type":"RedTowerRoof","x":594.3472778465664,"y":397.596608590853,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"RedTowerRoof","x":549.556117373338,"y":397.6266087543432,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"WoodBox","x":571.4838731556142,"y":383.6698231194937,"angle":0.7853981633974483},"Block.3":{"class":"Block","parent":"Scene01","type":"RedTowerRoof","x":502.925701817089,"y":397.56604699499354,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"RedTowerRoof","x":455.4625187853674,"y":397.68347576688166,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"RedTowerRoof","x":408.9086353726039,"y":397.66564018409343,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":518.7619748701724,"y":345.9301771952108,"angle":0.7853981633974483},"Block.7":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":460.80615555726393,"y":367.2676070084967,"angle":2.356194490192345},"Block.8":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":529.2930977118738,"y":335.47647708396727,"angle":0.7853981633974483},"Block.9":{"class":"Block","parent":"Scene01","type":"WoodBox","x":525.593207429638,"y":384.0498549703268,"angle":-2.3623651390658313},"Block.10":{"class":"Block","parent":"Scene01","type":"WoodBox","x":477.27895490629015,"y":384.0012526871062,"angle":0.7853981633974483},"Block.11":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":634.8071972718478,"y":389.18534032648154,"angle":0},"Block.12":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":367.4621082620584,"y":389.282673227311,"angle":0},"Block.13":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":450.9793039581944,"y":356.1005213077007,"angle":2.356194490192345},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":500.03938984427754,"y":363.88859405372,"angle":2.356194490192345},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["bomber","bomber","bomber"]}},
//23
{"Block.0":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":546.9299867208842,"y":301.7991326402671,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":593.0413474363695,"y":357.1497838134667,"angle":1.5707963267948966},"Block.2":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":520.6502773796186,"y":246.44764806258226,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":577.8913723967006,"y":246.44831677102573,"angle":1.5707963267948966},"Block.4":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":545.6305461813117,"y":191.09681778777534,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":642.9350724625515,"y":301.7995590922177,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":669.8914430907613,"y":357.14977295067985,"angle":1.5707963267948966},"Block.7":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":514.2649952210777,"y":357.14950689081036,"angle":1.5707963267948966},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":619.9617122383479,"y":278.94954431867035,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":551.1498998999,"y":389.6117858646765,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["casual","casual","casual"]}},
//24
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigColumn","x":480.1964003052809,"y":302.7987849461578,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigColumn","x":445.2761267136256,"y":357.3993085310403,"angle":1.5707963267948966},"Block.2":{"class":"Block","parent":"Scene01","type":"BigColumn","x":515.8816309269521,"y":357.39943739168456,"angle":1.5707963267948966},"Block.3":{"class":"Block","parent":"Scene01","type":"BigColumn","x":624.5044585573903,"y":248.1977259224661,"angle":1.5707963267948966},"Block.4":{"class":"Block","parent":"Scene01","type":"BigColumn","x":514.4572706445006,"y":248.19669417627304,"angle":1.5707963267948966},"Block.5":{"class":"Block","parent":"Scene01","type":"BigColumn","x":446.3531028586387,"y":248.19751655623116,"angle":1.5707963267948966},"Block.6":{"class":"Block","parent":"Scene01","type":"BigColumn","x":479.27073986455974,"y":193.59582619590316,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"BigColumn","x":622.7348807864211,"y":357.39928006168276,"angle":1.5707963267948966},"Block.8":{"class":"Block","parent":"Scene01","type":"BigColumn","x":657.0353515212386,"y":302.79899232620363,"angle":0},"Block.9":{"class":"Block","parent":"Scene01","type":"BigColumn","x":691.6520557658098,"y":248.19702724060753,"angle":1.5707963267948966},"Block.10":{"class":"Block","parent":"Scene01","type":"BigColumn","x":656.9005055928633,"y":193.5961275007025,"angle":0},"Block.11":{"class":"Block","parent":"Scene01","type":"BigColumn","x":694.0007271147209,"y":357.3995343073795,"angle":1.5707963267948966},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":657.7353241134269,"y":278.94873797443955,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":481.5261814156691,"y":278.9485969066315,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["casual","casual","casual","casual"]}},
//25
{"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":586.2547329900701,"y":311.7285015079422,"angle":0},"Block.0":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":550.6197116435437,"y":389.28593833050735,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":549.9962103287381,"y":357.4351845690099,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":547.4916159141886,"y":279.8799279964239,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":587.997909953883,"y":391.6807910366559,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":548.7639838674672,"y":311.73006995198716,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":558.144604353899,"y":334.58378375781336,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":554.375,"y":256.25,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["boomerang","boomerang","boomerang"]}},
//26
{"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":519.0002874069874,"y":357.7548780246974,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":393.38425753730917,"y":357.7550261420355,"angle":0},"Block.0":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":395.8741872233244,"y":389.1048084101808,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":457.74400534781944,"y":389.1048266563789,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":520.2510058862831,"y":389.10482294067816,"angle":0},"Soldier.2":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":457.12572681753767,"y":357.7548401485176,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"MetalBlock_1","x":314.7389593310101,"y":293.74915974228696,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"BigMetalColumn","x":316.3808321493332,"y":357.39885181854277,"angle":1.5707963267948966},"Soldier.3":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":312.1055623135818,"y":262.399817757964,"angle":0},"Soldier.4":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":660.8758758758761,"y":389.54488812542485,"angle":0},"Soldier.5":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":703.3758758758761,"y":389.5837529188992,"angle":0},"Soldier.6":{"class":"Soldier","parent":"Scene01","type":"EnemySoldier","x":744.0008758758761,"y":389.65000000000026,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["casual", "triple","bomber", "boomerang"]}},
//27
{"Block.0":{"class":"Block","parent":"Scene01","type":"BigBlock_3","x":578.3061708762099,"y":357.0213437739822,"angle":0},"Block.1":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":578.4330758057948,"y":389.0050546589921,"angle":0},"Block.2":{"class":"Block","parent":"Scene01","type":"BigBlock_3","x":604.7470634661188,"y":189.16931170513595,"angle":0},"Soldier.0":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":541.2466624054351,"y":244.91524558689125,"angle":0},"Block.3":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":578.536769425025,"y":293.0493011106021,"angle":0},"Block.4":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":571.4799751163955,"y":269.5326306175047,"angle":0},"Block.5":{"class":"Block","parent":"Scene01","type":"BigBlock_2","x":602.3174630530782,"y":246.15374551055447,"angle":0},"Block.6":{"class":"Block","parent":"Scene01","type":"WoodPlankBig","x":584.0370855468436,"y":212.6013714148611,"angle":0},"Soldier.1":{"class":"Soldier","parent":"Scene01","type":"EnemySoldierStrong","x":556.800605145872,"y":188.00479436889037,"angle":0},"Block.7":{"class":"Block","parent":"Scene01","type":"BigBlock_1","x":579.5023701052717,"y":325.0382602708296,"angle":0},"Block.8":{"class":"Block","parent":"Scene01","type":"SmallColumn","x":604.2493759042701,"y":225.16710420585463,"angle":0},"Cannon.0":{"class":"Cannon","parent":"Scene01","type":"Cannon","x":23,"y":363,"angle":0,"birds":["triple","triple"]}}
];var	OBJECTS_DESCRIPTION = {
	"justExplosion_1" : {
		"class" : "Effect",
		"visuals" : {
			"explosion" : {
				"class" : "GuiSprite",
				"width" : 80,
				"style" : "sprite",
				"height" : 58,
				"totalImage" : "FinalArt/Explosion/ExplosionHit.png",
				"totalImageWidth" : 720,
				"totalImageHeight" : 117,
				"totalTile" : 1,
				"spriteAnimations" : {
					"explosion" : { "frames" : [ 0, 1, 2, 3, 4, 5,
									6, 7, 8, 9, 10, 11, 12, 13, 14 ],
									"row" : 0 }
				}
			}
		},
		"lifeTime" : 1000
	},
	"casualExplosion_1" : {
		"class" : "Effect",
		"visuals" : {
			"explosion" : {
				"class" : "GuiSprite",
				"width" : 50,
				"style" : "sprite",
				"height" : 50,
				"totalImage" : "FinalArt/Explosion/Puff_Red.png",
				"totalImageWidth" : 1150,
				"totalImageHeight" : 50,
				"totalTile" : 1,
				"spriteAnimations" : {
					"explosion" : { "frames" : [ 0, 1, 2, 3, 4, 5,
									6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 ],
									"row" : 0 }
				}
			}
		},
		"lifeTime" : 2000
	},
	"bomberExplosion_1" : {
		"class" : "Effect",
		"visuals" : {
			"explosion" : {
				"class" : "GuiSprite",
				"width" : 50,
				"style" : "sprite",
				"height" : 50,
				"totalImage" : "FinalArt/Explosion/Puff_Green.png",
				"totalImageWidth" : 1150,
				"totalImageHeight" : 50,
				"totalTile" : 1,
				"spriteAnimations" : {
					"explosion" : { "frames" : [ 0, 1, 2, 3, 4, 5,
									6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 ],
									"row" : 0 }
				}
			}
		},
		"lifeTime" : 2000
	},
	"acceleratorExplosion_1" : {
		"class" : "Effect",
		"visuals" : {
			"explosion" : {
				"class" : "GuiSprite",
				"width" : 50,
				"style" : "sprite",
				"height" : 50,
				"totalImage" : "FinalArt/Explosion/Puff_Blue.png",
				"totalImageWidth" : 1150,
				"totalImageHeight" : 50,
				"totalTile" : 1,
				"spriteAnimations" : {
					"explosion" : { "frames" : [ 0, 1, 2, 3, 4, 5,
									6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 ],
									"row" : 0 }
				}
			}
		},
		"lifeTime" : 2000
	},	
	"tripleExplosion_1" : {
		"class" : "Effect",
		"visuals" : {
			"explosion" : {
				"class" : "GuiSprite",
				"width" : 50,
				"style" : "sprite",
				"height" : 50,
				"totalImage" : "FinalArt/Explosion/Puff_Yellow.png",
				"totalImageWidth" : 1150,
				"totalImageHeight" : 50,
				"totalTile" : 1,
				"spriteAnimations" : {
					"explosion" : { "frames" : [ 0, 1, 2, 3, 4, 5,
									6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 ],
									"row" : 0 }
				}
			}
		},
		"lifeTime" : 2000
	},	
	"boomerangExplosion_1" : {
		"class" : "Effect",
		"visuals" : {
			"explosion" : {
				"class" : "GuiSprite",
				"width" : 50,
				"style" : "sprite",
				"height" : 50,
				"totalImage" : "FinalArt/Explosion/Puff_Orange.png",
				"totalImageWidth" : 1150,
				"totalImageHeight" : 50,
				"totalTile" : 1,
				"spriteAnimations" : {
					"explosion" : { "frames" : [ 0, 1, 2, 3, 4, 5,
									6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 ],
									"row" : 0 }
				}
			}
		},
		"lifeTime" : 2000
	},			
	"Explosion_1" : {
		"class" : "Effect",
		"visuals" : {
			"explosion" : {
				"class" : "GuiSprite",
				"width" : 50,
				"style" : "sprite",
				"height" : 50,
				"totalImage" : "FinalArt/Explosion/Puff_Red.png",
				"totalImageWidth" : 1150,
				"totalImageHeight" : 50,
				"totalTile" : 1,
				"spriteAnimations" : {
					"explosion" : { "frames" : [ 0, 1, 2, 3, 4, 5,
									6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 ],
									"row" : 0 }
				}
			}
		},
		"lifeTime" : 2000
	},
	"casualExplosion_1" : {
		"class" : "Effect",
		"visuals" : {
			"explosion" : {
				"class" : "GuiSprite",
				"width" : 50,
				"style" : "sprite",
				"height" : 50,
				"totalImage" : "FinalArt/Explosion/Puff_Red.png",
				"totalImageWidth" : 1150,
				"totalImageHeight" : 50,
				"totalTile" : 1,
				"spriteAnimations" : {
					"explosion" : { "frames" : [ 0, 1, 2, 3, 4, 5,
									6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 ],
									"row" : 0 }
				}
			}
		},
		"lifeTime" : 2000
	},
	"bombExplosion_1" : {
		"class" : "Effect",
		"visuals" : {
			"explosion" : {
				"class" : "GuiSprite",
				"width" : 50,
				"style" : "sprite",
				"height" : 50,
				"totalImage" : "FinalArt/Explosion/Explo_Bomb.png",
				"totalImageWidth" : 600,
				"totalImageHeight" : 50,
				"totalTile" : 1,
				"spriteAnimations" : {
					"explosion" : { "frames" : [ 0, 1, 2, 3, 4, 5,
									6, 7, 8, 9, 10, 11, 12 ],
									"row" : 0 }
				}
			}
		},
		"lifeTime" : 1000
	},
	"BigBlockDestruction" : {
		"class" : "Effect",
		"visuals" : {
			"destruction" : {
				"class" : "GuiSprite",
				"width" : 40,
				"style" : "sprite",
				"height" : 32,
				"totalImage" : "FinalArt/Castles/BricksBreak.png",
				"totalImageWidth" : 174,
				"totalImageHeight" : 32,
				"totalTile" : 1,
				"spriteAnimations" : {
					"destruction" : { "frames" : [ 0, 1, 2, 3 ], "row" : 0 }
				}
			}
		},
		"lifeTime" : 500
	},
	"SmallBlockDestruction" : {
		"class" : "Effect",
		"visuals" : {
			"destruction" : {
				"class" : "GuiSprite",
				"width" : 20,
				"style" : "sprite",
				"height" : 20,
				"totalImage" : "FinalArt/Castles/BricksSmallBreak.png",
				"totalImageWidth" : 80,
				"totalImageHeight" : 20,
				"totalTile" : 1,
				"spriteAnimations" : {
					"destruction" : {
						"frames" : [ 0, 1, 2, 3  ],	"row" : 0 }
				}
			}
		},
		"lifeTime" : 500
	},
	"BackWall" : {
		"class" : "Block",
		"visuals"  : {
			"wall" : {
				"class" : "GuiSprite",
				"width" : 132,
				"height" : 94,
				"totalImage" : "FinalArt/Castles/CastleBack_001.png",
				"totalImageWidth" : 132,
				"totalImageHeight" : 94,
				"totalTile" : 1,
				"z" : -1
			}
		}
	},
	"SmallBlock_1" : {
		"class" : "Block",
		"visuals" : {
			"block" : {
				"class" : "GuiSprite",
				"width" : 30,
				"height" : 26,
				"totalImage" : "FinalArt/Castles/BrickSmall001.png",
				"totalImageWidth" : 90,
				"totalImageHeight" : 26,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 16,
			"height" : 15,
			"restitution" : 0,
			"friction" : 0.5,
			"linearDamping" : 0.05,
			"material" : "stone",
			"health" : 60,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  }]
		},
		"sounds" : { "hit" : "stoneCrack" }
	},
	"Ground" : {
		"class" : "Ground",
		"visuals" : { },
		"physics" : {
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 1300,
			"height" : 50,
			"static" : true,
			"restitution" : 0,
			"friction" : 1,
			"linearDamping" : 0.06,
			"material" : "ground"
		},
	},
	"SmallBlock_2" : {
		"class" : "Block",
		"visuals" : {
			"block" : {
				"class" : "GuiSprite",
				"width" : 30,
				"height" : 26,
				"totalImage" : "FinalArt/Castles/BrickSmall002.png",
				"totalImageWidth" : 90,
				"totalImageHeight" : 26,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 16,
			"height" : 15,
			"restitution" : 0,
			"friction" : 0.5,
			"linearDamping" : 0.05,
			"material" : "stone",
			"health" : 80,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  }]
		}		
	},
	"SmallBlock_3" : {
		"class" : "Block",
		"visuals" : {
			"block" : {
				"class" : "GuiSprite",
				"width" : 30,
				"height" : 26,
				"totalImage" : "FinalArt/Castles/BrickSmall003.png",
				"totalImageWidth" : 90,
				"totalImageHeight" : 26,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 16,
			"height" : 15,
			"restitution" : 0,
			"friction" : 0.5,
			"linearDamping" : 0.05,
			"material" : "stone",
			"health" : 80,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  }]
		}			
	},
	"BigBlock_1" : {
		"class" : "Block",
		"visuals" : {
			"block" : {
				"class" : "GuiSprite",
				"width" : 52,
				"height" : 42,
				"totalImage" : "FinalArt/Castles/Brick001.png",
				"totalImageWidth" : 157,
				"totalImageHeight" : 42,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 39.5,
			"height" : 32,
			"restitution" : 0,
			"friction" : 0.5,
			"linearDamping" : 0.05,
			"material" : "stone",
			"health" : 120,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 200, "animName" : "normal"}, 
								   {"minHealth" : 150,  "animName" : "first" },
								   {"minHealth" : 50,  "animName" : "last"  }]
		},
		"sounds" : { "hit" : "stoneCrack" }
	},
	"MetalBlock_1" : {
		"class" : "Block",
		"visuals" : {
			"block" : {
				"class" : "GuiSprite",
				"width" : 49.5,
				"height" : 42,
				"totalImage" : "FinalArt/Castles/Brick001Metal.png",
				"totalImageWidth" : 157,
				"totalImageHeight" : 42,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 39.5,
			"height" : 32,
			"restitution" : 0,
			"friction" : 0.8,
			"linearDamping" : 0.1,
			"health" : 200
		},
		"sounds" : { "hit" : "metalCrack" }	
	},
	"BigBlock_2" : {
		"class" : "Block",
		"visuals" : {
			"block" : {
				"class" : "GuiSprite",
				"width" : 52,
				"height" : 42,
				"totalImage" : "FinalArt/Castles/Brick002.png",
				"totalImageWidth" : 157,
				"totalImageHeight" : 42,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 }
				}
			}
		},
		"physics" : {
			"friction" : 0.1,
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 39.5,
			"height" : 32,
			"restitution" : 0,
			"friction" : 0.5,
			"linearDamping" : 0.05,
			"material" : "stone",
			"health" : 120,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 200, "animName" : "normal"}, 
								   {"minHealth" : 150,  "animName" : "first" },
								   {"minHealth" : 50,  "animName" : "last"  }]
		},
		"sounds" : { "hit" : "stoneCrack" }	
	},
	"BigBlock_3" : {
		"class" : "Block",
		"visuals" : {
			"block" : {
				"class" : "GuiSprite",
				"width" : 52,
				"height" : 42,
				"totalImage" : "FinalArt/Castles/Brick003.png",
				"totalImageWidth" : 157,
				"totalImageHeight" : 42,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 }
				}
			}
		},
		"physics" : {
			"friction" : 0.1,
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 39.5,
			"height" : 32,
			"restitution" : 0,
			"friction" : 0.5,
			"linearDamping" : 0.05,
			"material" : "stone",
			"health" : 120,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 200, "animName" : "normal"}, 
								   {"minHealth" : 150,  "animName" : "first" },
								   {"minHealth" : 50,  "animName" : "last"  }]
		},
		"sounds" : { "hit" : "stoneCrack" }		
	},
	"WindowBlock" : {
		"class" : "Block",
		"visuals" : {
			"block" : {
				"class" : "GuiSprite",
				"width" : 49.5,
				"height" : 42,
				"totalImage" : "FinalArt/Castles/Brick004.png",
				"totalImageWidth" : 157,
				"totalImageHeight" : 42,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 39,
			"height" : 32,
			"restitution" : 0,
			"friction" : 0.5,
			"linearDamping" : 0.05,
			"material" : "stone",
			"health" : 80,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  }]
		},
		"sounds" : { "hit" : "stoneCrack" }			
	},
	"RedTowerRoof" : {
		"class" : "Block",
		"visuals" : {
			"roof" : {
				"class" : "GuiSprite",
				"width" : 47,
				"height" : 25,
				"totalImage" : "FinalArt/Castles/RedRoof.png",
				"totalImageWidth" : 330,
				"totalImageHeight" : 25,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 },
					"dest"	 : { "frames" : [3, 4, 5, 6 ], 
												   "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Poly",
			"vertices" : [ {
			"x" : 23,
			"y" : 0
		}, {
			"x" : 43,
			"y" : 23
		}, {
			"x" : 0,
			"y" : 23
		}],
			"x" : -11,
			"y" : -6,
			"width" : 45,
			"height" : 23,
			"restitution" : 0,
			"friction" : 0.1,
			"linearDamping" : 0.05,
			"health" : 100,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  },
								   {"minHealth" : 0,   "animName" : "dest"  }]
		},
		"builtInDestruction" : true,
		"sounds" : { "hit" : ["woodCrack1", "woodCrack2"] }	
	},
	"BigColumn" : {
		"class" : "Block",
		"visuals" : {
			"column" : {
				"class" : "GuiSprite",
				"width" : 107,
				"height" : 25,
				"totalImage" : "FinalArt/Castles/ColumnBig.png",
				"totalImageWidth" : 221,
				"totalImageHeight" : 98,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 },
					"dest"	 : { "frames" : [3, 4, 5, 6 ], 
												   "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 94,
			"height" : 13,
			"restitution" : 0,
			"friction" : 0.5,
			"linearDamping" : 0.05,
			"health" : 200,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 175, "animName" : "normal"}, 
								   {"minHealth" : 145,  "animName" : "first" },
								   {"minHealth" : 75,  "animName" : "last"  },
								   {"minHealth" : 0,   "animName" : "dest"  }]
		},
		"builtInDestruction" : true,
		"sounds" : { "hit" : "stoneCrack" }				
	},
	"BigMetalColumn" : {
		"class" : "Block",
		"visuals" : {
			"column" : {
				"class" : "GuiSprite",
				"width" : 107,
				"height" : 25,
				"totalImage" : "FinalArt/Castles/ColumnBigMetal.png",
				"totalImageWidth" : 221,
				"totalImageHeight" : 98,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 },
					"dest"	 : { "frames" : [3, 4, 5, 6 ], 
												   "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 9.5,
			"y" : 5,
			"width" : 95.5,
			"height" : 14,
			"restitution" : 0,
			"friction" : 0.8,
			"linearDamping" : 0.05,
			"health" : 200
		},
		"builtInDestruction" : true,
		"sounds" : { "hit" : "metalCrack" }				
	},
	"SmallColumn" : {
		"class" : "Block",
		"visuals" : {
			"column" : {
				"class" : "GuiSprite",
				"width" : 72,
				"height" : 20,
				"totalImage" : "FinalArt/Castles/ColumnSmall.png",
				"totalImageWidth" : 225,
				"totalImageHeight" : 61,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 },
					"dest"	 : { "frames" : [3, 4, 5, 6 ], 
												   "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 9,
			"y" : 5,
			"width" : 62,
			"height" : 10,
			"restitution" : 0.1,
			"friction" : 0.5,
			"linearDamping" : 0.05,
			"health" : 100,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  },
								   {"minHealth" : 0,   "animName" : "dest"  }]
		},
		"builtInDestruction" : true,
		"sounds" : { "hit" : "stoneCrack" }	
	},
	"WoodBox" : {
		"class" : "Block",
		"visuals" : {
			"box" : {
				"class" : "GuiSprite",
				"width" : 35,
				"height" : 28,
				"totalImage" : "FinalArt/Castles/WoodBox.png",
				"totalImageWidth" : 256,
				"totalImageHeight" : 32,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 },
					"dest"	 : { "frames" : [3, 4, 5, 6 ], 
												   "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 0,
			"y" : 0,
			"width" : 32,
			"height" : 28,
			"restitution" : 0.4,
			"friction" : 0.1,
			"linearDamping" : 0.05,
			"health" : 40,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  },
								   {"minHealth" : 0,   "animName" : "dest"  }]
		},
		"builtInDestruction" : true,
		"sounds" : { "hit" : ["woodCrack1", "woodCrack2"] }			
	},
	"WoodPlankBig" : {
		"class" : "Block",
		"visuals" : {
			"plank" : {
				"class" : "GuiSprite",
				"width" : 97,
				"height" : 20,
				"totalImage" : "FinalArt/Castles/WoodPlankBig.png",
				"totalImageWidth" : 586,
				"totalImageHeight" : 20,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 },
					"dest"	 : { "frames" : [3, 4, 5 ], 
												   "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 0,
			"y" : 0,
			"width" : 94,
			"height" : 14,
			"restitution" : 0.4,
			"friction" : 0.1,
			"linearDamping" : 0.05,
			"health" : 35,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  },
								   {"minHealth" : 0,   "animName" : "dest"  }]
		},
		"builtInDestruction" : true,
		"sounds" : { "hit" : ["woodCrack1", "woodCrack2"] }			
	},
	"WoodPlankThin" : {
		"class" : "Block",
		"visuals" : {
			"plank" : {
				"class" : "GuiSprite",
				"width" : 73,
				"height" : 6,
				"totalImage" : "FinalArt/Castles/WoodPlankThin.png",
				"totalImageWidth" : 530,
				"totalImageHeight" : 10,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 },
					"dest"	 : { "frames" : [3, 4, 5, 6 ], 
												   "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 0,
			"y" : 1,
			"width" : 71,
			"height" : 5,
			"restitution" : 0,
			"linearDamping" : 0.05,
			"friction" : 0.1,
			"health" : 15,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  },
								   {"minHealth" : 0,   "animName" : "dest"  }]
		},
		"builtInDestruction" : true,
		"sounds" : { "hit" : ["woodCrack1", "woodCrack2"] }			
	},
	"WoodPlankSmall" : {
		"class" : "Block",
		"visuals" : {
			"plank" : {
				"class" : "GuiSprite",
				"width" : 50,
				"height" : 12,
				"totalImage" : "FinalArt/Castles/WoodPlankSmall.png",
				"totalImageWidth" : 358,
				"totalImageHeight" : 18,
				"totalTile" : 1,
				"spriteAnimations" : {
					"normal" : { "frames" : [ 0 ], "row" : 0 },
					"first"  : { "frames" : [ 1 ], "row" : 0 },
					"last"   : { "frames" : [ 2 ], "row" : 0 },
					"dest"	 : { "frames" : [3, 4, 5, 6 ], 
												   "row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Box",
			"x" : 0,
			"y" : 0,
			"width" : 44,
			"height" : 12,
			"restitution" : 0,
			"linearDamping" : 0.05,
			"friction" : 0.1,
			"health" : 15,
			"destructable" : true,
			"destructionLevels" : [{"minHealth" : 100, "animName" : "normal"}, 
								   {"minHealth" : 75,  "animName" : "first" },
								   {"minHealth" : 25,  "animName" : "last"  },
								   {"minHealth" : 0,   "animName" : "dest"  }]
		},
		"builtInDestruction" : true,
		"sounds" : { "hit" : ["woodCrack1", "woodCrack2"] }			
	},
	"EnemySoldier" : {
		"class" : "Soldier",
		"visuals" : {
			"soldier" : {
				"class" : "GuiSprite",
				"width" : 50, 
				"height" : 50,
				"totalImage" : "FinalArt/Soldiers/EnemyPigSheet1.png",
				"totalImageWidth" : 150,
				"totalImageHeight" : 50,
				"totalTile" : 3,
				"type" : "EnemySoldier",
				"spriteAnimations" : {
					"normal" : 		{ "frames" : [ 0 ],	"row" : 0 },
					"dead" : 		{ "frames" : [ 2 ],	"row" : 0 },
					"beated" : 		{ "frames" : [ 1 ],	"row" : 0 }
				}
			}
		},
		"physics" : {
				"type" : "Box",					
				"x" : 11,
				"y" : 15,
				"width" : 27,
				"height" : 31,
				"restitution" : 0,
				"linearDamping" : 0.05,
				"friction" : 0.6,
				"health" : 10,
				"destructable" : true,
				"destructionLevels" : [{"minHealth" : 7, "animName" : "normal"}, 
									   {"minHealth" : 3,   "animName" : "beated"},
								   		{"minHealth" : 0,   "animName" : "dead"  }]
		}		
	},
	"EnemySoldierStrong" : {
		"class" : "Soldier",
		"visuals" : {
			"soldier" : {
				"class" : "GuiSprite",
				"width" : 50, 
				"height" : 50,
				"totalImage" : "FinalArt/Soldiers/EnemyPigSheet2.png",
				"totalImageWidth" : 150,
				"totalImageHeight" : 50,
				"totalTile" : 3,
				"type" : "EnemySoldier",
				"spriteAnimations" : {
					"normal" : 		{ "frames" : [ 0 ],	"row" : 0 },
					"dead" : 		{ "frames" : [ 2 ],	"row" : 0 },
					"beated" : 		{ "frames" : [ 1 ],	"row" : 0 }
				}
			}
		},
		"physics" : {
				"type" : "Box",					
				"x" : 10,
				"y" : 12,
				"width" : 29,
				"height" : 34,
				"restitution" : 0,
				"linearDamping" : 0.05,
				"friction" : 0.6,
				"health" : 20,
				"destructable" : true,
				"destructionLevels" : [{"minHealth" : 10, "animName" : "normal"}, 
									   {"minHealth" : 5,   "animName" : "beated"},
								   		{"minHealth" : 0,   "animName" : "dead"  }]
		}		
	},
	"Constraint" : {
		"class" : "Constraint",
		"visuals" : {},
		"physics" : {
				"type" : "Box",					
				"x" : 0,
				"y" : 0,
				"width" : 10,
				"height" : 1138,
				"sensor" : true,
				"static" : true
		}		
	},	
	"Cannon" : {
		"class" : "Cannon",
		"width" : 200,
		"visuals" : {
			"cannonier" : {
				"class" : "GuiDiv",
				"width" : 76.5,
				"height" : 82.5
			},
			"barrel" : {
				"class" : "GuiSprite",
				"width" : 146,
				"height" : 41,
				"totalImage" : "",
				"totalImageWidth" : 653,
				"totalImageHeight" : 164,
				"totalTile" : 1,
				"x" : 120,
				"y" : -33,
				"spriteAnimations" : {
					"getReady" : { "frames" : [ 0 ], "row" : 0 },
					"fireStart" 	   : { "frames" : [ 0, 1, 2, 3, 5 ],	
													 "row" : 0 },
					"fireEnd" 	   : { "frames" : [  6, 7, 8, 
									9, 10, 11, 12, 0 ],	
													 "row" : 0 }
				}		
			},
			"nearWheel" : {
				"class" : "GuiSprite",
				"width" : 48,
				"height" : 100,
				"totalImage" : "FinalArt/Cannon/Slingshot_Up.png",
				"totalImageWidth" : 48,
				"totalImageHeight" : 100,
				"totalTile" : 1,
				"x" : 104,
				"y" : -44,
				"z" : 150
			},
			"nearWheel2" : {
				"class" : "GuiSprite",
				"width" : 48,
				"height" : 100,
				"totalImage" : "FinalArt/Cannon/Slingshot_Down.png",
				"totalImageWidth" : 48,
				"totalImageHeight" : 100,
				"totalTile" : 1,
				"x" : 104,
				"y" : -44,
	            "z" : 1
			},
	        "backRubber" : {
	            "class" : "GuiSprite",
	            "width" : 32,
	            "height" : 32,
	            "totalImage" : "FinalArt/Cannon/slingshotRubber.png",
	            "totalImageWidth" : 32,
	            "totalImageHeight" : 32,
	            "totalTile" : 1,
	            "z" : 0
	        },
	        "frontRubber" : {
	            "class" : "GuiSprite",
	            "width" : 32,
	            "height" : 32,
	            "totalImage" : "FinalArt/Cannon/slingshotRubber.png",
	            "totalImageWidth" : 32,
	            "totalImageHeight" : 32,
	            "totalTile" : 1,
	            "z" : 149
	        },
	        "leatherPad" : {
	            "class" : "GuiSprite",
	            "width" : 32,
	            "height" : 32,
	            "totalImage" : "FinalArt/Cannon/leatherPad.png",
	            "totalImageWidth" : 32,
	            "totalImageHeight" : 32,
	            "totalTile" : 1,
	            "z" : 149
	            }
			}
		}
	};var AMMO_DESC = {
	"casual" : {
		"class" : "CasualBird",
		"type" : "casual",
		"visuals" : {
			"main" : {
				"class" : "GuiSprite",
				"width" : 50,
				"height" : 50,
				"totalImage" : "FinalArt/CannonBalls/Bird_Red_001.png",
				"totalImageWidth" : 200,
				"totalImageHeight" : 50,
				"totalTile" : 3,
				"transformX" : 58,
				"transformY" : 60,
				"spriteAnimations" : {
					"normal" : 		{ "frames" : [ 0 ],	"row" : 0 },
					"attack" : 		{ "frames" : [ 2 ],	"row" : 0 },
					"loaded" : 		{ "frames" : [ 1 ],	"row" : 0 },
					"hurt" : 		{ "frames" : [ 3 ],	"row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Circle",					
			"x" : 21,
			"y" : 25,
			"width" : 13,
			"height" : 13,
			"radius" : 13,
			"friction" : 0.6,		
			"restitution" : 0.2,
			"linearDamping" : 0.01,
			"angularDamping" : 0.02
		},
		"sounds": {
			"launch" : "birdRed",
			"explode" : ["poof1", "poof2"],
			"groundHit" : "groundCrack"
		}
	},
	"bomb" : {
		"class" : "ExplosiveBird",
		"type" : "bomb",
		"visuals" : {
			"main" : {
				"class" : "GuiSprite",
				"width" : 50,
				"height" : 50,
				"totalImage" : "FinalArt/CannonBalls/Bird_Black_001.png",
				"totalImageWidth" : 200,
				"totalImageHeight" : 50,
				"totalTile" : 3,
				"transformX" : 52,
				"transformY" : 59,
				"spriteAnimations" : {
					"normal" : 		{ "frames" : [ 0 ],	"row" : 0 },
					"attack" : 		{ "frames" : [ 2 ],	"row" : 0 },
					"loaded" : 		{ "frames" : [ 1 ],	"row" : 0 },
					"hurt" : 		{ "frames" : [ 3 ],	"row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Circle",					
			"x" : 21,
			"y" : 25,
			"width" : 13,
			"height" : 13,
			"radius" : 13,
			"friction" : 0.6,	
			"restitution" : 0.2,
			"linearDamping" : 0.01
		},
		"sounds": {
			"launch" : ["birdBlack1", "birdBlack2"],
			"explode" : "explosionL",
			"groundHit" : "groundCrack"
		}
	},
	"bomber" : {
		"class" : "BomberBird",
		"type" : "bomber",
		"visuals" : {
			"main" : {
				"class" : "GuiSprite",
				"width" : 50,
				"height" : 50,
				"totalImage" : "FinalArt/CannonBalls/Bird_Green_001.png",
				"totalImageWidth" : 200,
				"totalImageHeight" : 50,
				"totalTile" : 3,
				"transformX" : 58,
				"transformY" : 60,
				"spriteAnimations" : {
					"normal" : 		{ "frames" : [ 0 ],	"row" : 0 },
					"attack" : 		{ "frames" : [ 2 ],	"row" : 0 },
					"loaded" : 		{ "frames" : [ 1 ],	"row" : 0 },
					"hurt" : 		{ "frames" : [ 3 ],	"row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Circle",					
			"x" : 21,
			"y" : 25,
			"width" : 13,
			"height" : 13,
			"radius" : 13,
			"friction" : 0.6,	
			"restitution" : 0.2,
			"linearDamping" : 0.01
		},
		"sounds": {
			"launch" : "birdGreen",
			"explode" : ["poof1", "poof2"],
			"alter" : "birdBlue2",
			"groundHit" : "groundCrack"
		}
	},
	"accelerator" : {
		"class" : "AcceleratorBird",
		"type" : "accelerator",
		"visuals" : {
			"main" : {
				"class" : "GuiSprite",
				"width" : 50,
				"height" : 50,
				"totalImage" : "FinalArt/CannonBalls/Bird_Blue_001.png",
				"totalImageWidth" : 250,
				"totalImageHeight" : 50,
				"totalTile" : 3,
				"transformX" : 58,
				"transformY" : 59,
				"spriteAnimations" : {
					"normal" : 		{ "frames" : [ 0 ],	"row" : 0 },
					"attack" : 		{ "frames" : [ 2 ],	"row" : 0 },
					"loaded" : 		{ "frames" : [ 1 ],	"row" : 0 },
					"hurt" : 		{ "frames" : [ 3 ],	"row" : 0 },
					"goGo" : 		{ "frames" : [ 4 ],	"row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Circle",					
			"x" : 20,
			"y" : 19,
			"width" : 13,
			"height" : 13,
			"radius" : 13,
			"friction" : 0.6,	
			"restitution" : 0.2,
			"linearDamping" : 0.01
		},
		"sounds": {
			"launch" : "birdBlue1",
			"alter" : "birdBlue2",
			"explode" : ["poof1", "poof2"],
			"groundHit" : "groundCrack"
		}
	},				
	"triple" : {
		"class" : "PackBird",
		"type" : "triple",
		"visuals" : {
			"main" : {
				"class" : "GuiSprite",
				"width" : 50,
				"height" : 50,
				"totalImage" : "FinalArt/CannonBalls/Bird_Yellow_001_friends.png",
				"totalImageWidth" : 100,
				"totalImageHeight" : 50,
				"totalTile" : 3,
				"transformX" : 56,
				"transformY" : 70,
				"spriteAnimations" : {
					"normal" : 		{ "frames" : [ 0 ],	"row" : 0 },
					"loaded" : 		{ "frames" : [ 1 ],	"row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Circle",					
			"x" : 25,
			"y" : 20,
			"width" : 13,
			"height" : 13,
			"radius" : 13,
			"friction" : 0.6,	
			"restitution" : 0.2,
			"linearDamping" : 0.01
		},
		"sounds": {
			"launch" : "birdYellow"
		}
	},		
	"boomerang" : {
		"class" : "BoomerangBird",
		"type" : "boomerang",
		"visuals" : {
			"main" : {
				"class" : "GuiSprite",
				"width" : 50,
				"height" : 50,
				"totalImage" : "FinalArt/CannonBalls/Bird_Orange_001.png",
				"totalImageWidth" : 200,
				"totalImageHeight" : 50,
				"totalTile" : 3,
				"transformX" : 56,
				"transformY" : 66,
				"spriteAnimations" : {
					"normal" : 		{ "frames" : [ 0 ],	"row" : 0 },
					"attack" : 		{ "frames" : [ 2 ],	"row" : 0 },
					"loaded" : 		{ "frames" : [ 1 ],	"row" : 0 },
					"hurt" : 		{ "frames" : [ 3 ],	"row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Circle",					
			"x" : 21,
			"y" : 25,
			"width" : 13,
			"height" : 13,
			"radius" : 13,
			"friction" : 0.6,	
			"restitution" : 0.2,
			"linearDamping" : 0.01
		},
		"sounds": {
			"launch" : "birdOrange1",
			"alter": "birdOrange2",
			"explode" : ["poof1", "poof2"],
			"groundHit" : "groundCrack"
		}
	},			
	"egg" : {
		"class" : "Egg",
		"type" : "egg",
		"visuals" : {
			"main" : {
				"class" : "GuiSprite",
				"width" : 25,
				"height" : 25,
				"totalImage" : "FinalArt/CannonBalls/egg.png",
				"totalImageWidth" : 25,
				"totalImageHeight" : 25,
				"totalTile" : 1
			}
		},
		"physics" : {
			"type" : "Circle",					
			"x" : 10,
			"y" : 10,
			"width" : 10,
			"height" : 10,
			"radius" : 6,
			"friction" : 0.6,	
			"restitution" : 0.2,
			"linearDamping" : 0.01
		},
		"sounds": {
			"explode" : "explosionS"
		}
	},		
	"birds" : {
		"class" : "LittleBird",
		"type" : "birds",
		"visuals" : {
			"main" : {
				"class" : "GuiSprite",
				"width" : 50,
				"height" : 50,
				"totalImage" : "FinalArt/CannonBalls/Bird_Yellow_001.png",
				"totalImageWidth" : 200,
				"totalImageHeight" : 50,
				"totalTile" : 3,
				"transformX" : 50,
				"transformY" : 56,
				"spriteAnimations" : {
					"attack" : 		{ "frames" : [ 2 ],	"row" : 0 },
					"hurt" : 		{ "frames" : [ 3 ],	"row" : 0 }
				}
			}
		},
		"physics" : {
			"type" : "Circle",					
			"x" : 20,
			"y" : 17,
			"width" : 13,
			"height" : 13,
			"radius" : 13,
			"friction" : 0.6,	
			"restitution" : 0.2,
			"linearDamping" : 0.01
		},
		"sounds": {
			"explode" : ["poof1", "poof2"],
			"groundHit" : "groundCrack"
		}
	}					
};DEFAULT_B2WORLD_RATIO = 30;
var RATIO_COEF = DEFAULT_B2WORLD_RATIO * 115;//1150;
var GAME_BALANCE = {
	BattleScene: {
		CANNON_FIRST_LOAD_DELAY : 500,
		SHOW_RESULT_DELAY : 2000,
		MAX_TIME_WAIT_FOR_FINISH : 3000
	},
	Block : {
		GROUND_HIT_POWER : 20,
		SELF_HIT_POWER : 30,
		DAMAGE_TO_SCORE_RATIO : 2,
		SELF_DESTR_RATIO : 0.000002 * RATIO_COEF	
	},
	Cannon : {
		MIN_POWER : 0.2, // [0..1]
		POWER_RATING : 35000 / RATIO_COEF,
		TARGET_DISTANCE : 60,
		POWER_RATIO : 0.01,
		LOADING_SPEED : 400,
		EMPTY_SLINGSHOT_ANGLE : Math.PI / 1.1,
		CLOUD_POOL_SIZE : 30,
	    NO_NAVIGATION_LOW_POWER : {FROM: -117, TO: -40},
//    	NO_NAVIGATION_HIGH_POWER : {FROM: -110, TO: -60},
//    	NO_NAVIGATION_POWER_DEF : 0.5,
    	LEATHER_PAD_DEPTH : 5
	},
	Ammo : {
		POINT_CLOUD_STEP : 60,
		BIRD_DESTRUCTION_RATIO : 0.005,
		POINT_CLOUD_START_OFFSET : 80,
		ROTATION_THRESHHOLD : 5,
		
		Birds : {
		    casual : {
		        hitRatio : 50
		    },
		    bomb : {
		        hitRatio : 40,
		        bang : {
		            radius : 85,
		            force : 100,
		            duration : 2,
		            damageDecr : 0.005
		        }
		    },
		    bomber : {
		        hitRatio : 25,
		        shootRange : Math.PI / 2,
		        eggCount : 3,
		        eggSpeed : 1.5,
		        flyAwayAngle : -60	// in degrees
		    },
		    egg : {
		        hitRatio : 1,
		        bang : {
		            radius : 80,
		            force : 80,
		            duration : 2,
		            damageDecr : 0.025
		        }
		    },
		    accelerator : {
		        hitRatio : 25
		    },
		    boomerang : {
		        hitRatio : 45,
		        dVxRating : 0.004
		    },
		    birds : {
		        hitRatio : 30
		    },
		    triple : {
		        birdsCount : 2,
		        birdOffsetRatio : {
		        	x : 1.2,
		        	y : 1
		        },
		        birdLaunchPowerRatio : 1
		    }
		}
	}
};/**
 * Main.js
 */
var SCORE = null;
var GUI_SPRITE_IMAGES_FROM_RESOURCES = true;
var GUISPRITE_HACK_ON = true;

// Entry point of the game

// $(document).ready(function() {
function startTheGame() {
	// YAHOO.Profiler.registerObject('BattleScene', BattleScene.prototype,
	// true);
	//	
	// var el = document.createElement('div');
	// el.setAttribute('style', 'position: fixed; z-index: 99999; top: 0; left:
	// 0; pointer-events : none;');
	// el.id = 'profilerDivId';
	// document.body.appendChild(el);
	// setInterval(function() {
	// var i, el = document.getElementById('profilerDivId'),
	// report = YAHOO.Profiler.getFullReport(),
	// reportString = "<table>";
	//	
	// reportString += '<tr>';
	// reportString +=
	// '<td>name</td><td>total,ms</td><td>max,ms</td><td>min,ms</td><td>calls</td>';
	// reportString += '</tr>';
	//	
	// var reportArray = [];
	// for(i in report) {
	// if(Object.prototype.hasOwnProperty.call(report, i)) {
	// report[i].name = i;
	// reportArray.push(report[i])
	// }
	// }
	//	
	// reportArray.sort(function(a, b) {
	// if (a.avg * a.calls > b.avg * b.calls) {
	// return -1;
	// }
	// return 1;
	// });
	//	
	// for(i = 0; i < Math.min(10, reportArray.length); i++) {
	// var d = reportArray[i];
	// reportString += '<tr>';
	// reportString += '<td>' + d.name + '</td><td>' + Math.ceil(d.avg *
	// d.calls) + '</td><td>'+ d.max +'</td><td>' + d.min + '</td><td>' +
	// d.calls + '</td>';
	// reportString += '</tr>';
	// }
	//	
	// reportString += '</table>';
	//	
	// el.innerHTML = reportString;
	// }, 500);

	// Creating account a singleton
	(new CannonsAndSoldiersAccount()).init();

	Device.init();
	Resources.init();

	if (typeof(SG_Hooks)!='undefined' && SG_Hooks) {
		var lng = SG_Hooks.getLanguage([ 'en', 'es', 'de', 'fr', 'it', 'pt',
				'tr', 'ru' ]);
		SG_Hooks.setOrientationHandler(Screen.isCorrectOrientation);
		SG_Hooks.setResizeHandler(Screen.windowOnResize);
	} else {
		lng = navigator.language || navigator.userLanguage;
	}
     
     lng = "en";
	if (lng.indexOf('ru') !== -1) {
		Resources.setLanguage("RU");
	} else if (lng.indexOf('fr') !== -1) {
		Resources.setLanguage("FR");
	} else if (lng.indexOf('it') !== -1) {
		Resources.setLanguage("IT");
	} else if (lng.indexOf('es') !== -1) {
		Resources.setLanguage("ES");
	} else if (lng.indexOf('de') !== -1) {
		Resources.setLanguage("DE");
	} else if (lng.indexOf('tr') !== -1) {
		Resources.setLanguage("TR");
	} else if (lng.indexOf('pt') !== -1) {
		Resources.setLanguage("PT");
	} else {
		Resources.setLanguage("EN");
	}

	// info about levels and scores
	try {
		SCORE = JSON.parse(Device.getStorageItem("scores", {}));
		$['each'](SCORE, function(id, score) {
			score *= 1;
		});
	} catch (e) {
		SCORE = {};
	}

	// IMAGES
	//Resources.addResolution("low", "images/low/");
	Resources.addResolution("normal", "images/", true);

	// Switch resolution if running on slow device
	if (Device.isSlow()) {
		//Resources.setResolution("low");
		PHYSICS_CAPACITY = 10;
		// turn off sound on slow iPhones by default
		if (Device.isAppleMobile()) {
			Sound.TURNED_OFF_BY_DEFAULT = true;
		}
	}

	Screen.init(Account.instance, true);

	Loader['updateLoadingState'](Loader['currentLoadingState']() + 10);
	var currentPecent = Loader['currentLoadingState']();
	var remainPecent = 100 - currentPecent;
	
	var preloadProgress = function(data) {
		Loader['updateLoadingState'](currentPecent
				+ Math.round(remainPecent
						* (data.loaded / data.total)));
	};
	
	var preloadComplete = function(data) {
		Account.instance.readGlobalUpdate(Account.instance.states["MenuState01"]);
		SG_Hooks.loaded();

	};

	var mediaArray = [ "FinalArt/Backgrounds/background_new.jpg",
	                   "FinalArt/Menu/LevelSelect/FailureShit.png",
	                   "FinalArt/Menu/LevelSelect/Level_Locked.png",
	                   "FinalArt/Menu/LevelSelect/NumberCell001.png",
	                   "FinalArt/Menu/LevelSelect/ScoreCell001.png",
	                   "FinalArt/Menu/LevelSelect/Sheet3.png",
	                   "FinalArt/Menu/LevelSelect/VictoryShit.png",
	                   "FinalArt/Menu/Main/Button1.png",
	                   "FinalArt/Menu/Main/Button2.png",
	                   "FinalArt/Menu/Main/FAQ.png",
	                   "FinalArt/Menu/Main/logicking.png",
	                   "FinalArt/Menu/Main/Sheet1.png",
	                   "FinalArt/Menu/Main/SoundOff.png",
	                   "FinalArt/Menu/Main/SoundOn.png",
	                   "FinalArt/Menu/Main/zastavka.jpg",
	                   "FinalArt/Menu/Pause/forward.png",
	                   "FinalArt/Menu/Pause/ok.png",
	                   "FinalArt/Menu/Pause/Pause1.png",
	                   "FinalArt/Menu/Pause/return.png",
	                   "FinalArt/Menu/Pause/select_level.png",
	                   "FinalArt/Menu/Pause/shadow.png",
	                   "FinalArt/Menu/Pause/shadowed.png",
	                   "FinalArt/Tutorial/acceleratorTutorial.png",
	                   "FinalArt/Tutorial/bomberTutorial.png",
	                   "FinalArt/Tutorial/bombTutorial.png",
	                   "FinalArt/Tutorial/boomerangTutorial.png",
	                   "FinalArt/Tutorial/doubleTutorial.png",
	                   "FinalArt/Tutorial/shootTutorial.png",
	                   "FinalArt/CannonBalls/Bird_Black_001.png",
	                   "FinalArt/CannonBalls/Bird_Blue_001.png",
	                   "FinalArt/CannonBalls/Bird_Green_001.png",
	                   "FinalArt/CannonBalls/Bird_Orange_001.png",
	                   "FinalArt/CannonBalls/Bird_Red_001.png",
	                   "FinalArt/CannonBalls/Bird_Yellow_001.png",
	                   "FinalArt/CannonBalls/Bird_Yellow_001_friends.png",
	                   "FinalArt/CannonBalls/egg.png",
	                   "FinalArt/Explosion/Explo_Bomb.png",
	                   "FinalArt/Explosion/ExplosionHit.png",
	                   "FinalArt/Explosion/Puff_Black.png",
	                   "FinalArt/Explosion/Puff_Blue.png",
	                   "FinalArt/Explosion/Puff_Green.png",
	                   "FinalArt/Explosion/Puff_Orange.png",
	                   "FinalArt/Explosion/Puff_Red.png",
	                   "FinalArt/Explosion/Puff_Yellow.png",
	                   "France.png",
	                   "Germany.png",
	                   "Italy.png",
	                   "logo2.png",
	                   "Portugal.png",
	                   "Russia.png",
	                   "Spain.png",
	                   "turkey.png",
	                   "United_Kingdom.png",
	                   "FinalArt/Castles/Brick001.png",
	                   "FinalArt/Castles/Brick001Metal.png",
	                   "FinalArt/Castles/Brick002.png",
	                   "FinalArt/Castles/Brick003.png",
	                   "FinalArt/Castles/Brick004.png",
	                   "FinalArt/Castles/Brick3Destr.png",
	                   "FinalArt/Castles/BricksBreak.png",
	                   "FinalArt/Castles/BrickSmall001.png",
	                   "FinalArt/Castles/BrickSmall002.png",
	                   "FinalArt/Castles/BrickSmall003.png",
	                   "FinalArt/Castles/BricksSmallBreak.png",
	                   "FinalArt/Castles/CastleBack_001.png",
	                   "FinalArt/Castles/ColumnBig.png",
	                   "FinalArt/Castles/ColumnBigMetal.png",
	                   "FinalArt/Castles/ColumnSmall.png",
	                   "FinalArt/Castles/RedRoof.png",
	                   "FinalArt/Castles/WoodBox.png",
	                   "FinalArt/Castles/WoodPlankBig.png",
	                   "FinalArt/Castles/WoodPlankSmall.png",
	                   "FinalArt/Castles/WoodPlankThin.png",
	                   "FinalArt/Castles/WoodRoof.png"

	                   ];
	Resources.loadMedia(mediaArray, preloadComplete,
			preloadProgress);
	
//	if (Device.isMobile()) {
//		setInterval(function() {
//			window['scrollTo'](0, 1);
//		}, 500);
//	}
};
// });

if (window.attachEvent) {
	window.attachEvent("onload", startTheGame);
} else {
	window.addEventListener("load", startTheGame, true);
}
CannonsAndSoldiersAccount.prototype = new Account();
CannonsAndSoldiersAccount.prototype.constructor = CannonsAndSoldiersAccount;

/**
 * @constructor
 */
function CannonsAndSoldiersAccount(parent) {
	CannonsAndSoldiersAccount.parent.constructor.call(this);
};

CannonsAndSoldiersAccount.inheritsFrom(Account);
CannonsAndSoldiersAccount.prototype.className = "CannonsAndSoldiersAccount";

CannonsAndSoldiersAccount.prototype.init = function() {
	CannonsAndSoldiersAccount.parent.init.call(this);
	this.states = new Object();

	this.states["MenuState01"] = {
		"MenuState01" : {
			"class" : MenuState.prototype.className,
			"parent" : "Account01",
			"children" : {}
		}
	};

	this.states["LevelMenuState01"] = {
		"LevelMenuState01" : {
			"class" : LevelMenuState.prototype.className,
			"parent" : "Account01",
			"children" : {}
		}
	};
	
	this.states["GameState01"] = {
		"GameState01" : {
			"class" : GameState.prototype.className,
			"parent" : "Account01",
			"scene" : "Scene01",
			"children" : {
				"Scene01": {
			        "class": "BattleScene",
			        "parent": "sceneContainer",
			        "gameClass": "BattleScene",
			        "x": 0,
			        "y": 0,
			        "width": 800,
			        "height": 500,
			        "groundLevel": 65,
			        "type": "Scene",
			        "id": "Scene01",
			        "canvas" : true,
			        "children" : {
			        	"Ground01": {
			        		"id" : "Ground01",
			        		"class" : "Ground",
			        		"type" : "Ground",
			        		"x" : 500,
			        		"y" : 430,
			        		"angle" : 0
			        	},
			        	"LeftConstraint": {
			        		"id" : "LeftConstraint",
			        		"class" : "Constraint",
			        		"type" : "Constraint",
			        		"x" : -10,
			        		"y" : 640,
			        		"angle" : 0
			        	},
			        	"RightConstraint": {
			        		"id" : "RightConstraint",
			        		"class" : "Constraint",
			        		"type" : "Constraint",
			        		"x" : 1138,
			        		"y" : 640,
			        		"angle" : 0
			        	},
			        	"TopConstraint": {
			        		"id" : "TopConstraint",
			        		"class" : "Constraint",
			        		"type" : "Constraint",
			        		"x" : 569,
			        		"y" : -150,
			        		"angle" : 1.57
			        	}
			        }
				}
			}
		}
	};
	
	Account.instance = this;
	
	var logo = guiFactory.createObject("GuiDiv", {
		"parent" : this.backgroundState.mask,
		"background": {
			"image" : "images/icon114x114alpha.png"
		},
		"style" : "dialog",
		"width" : 114,
		"height" : 114,
		"x" : "50%",
		"y" : "50%",
		"offsetY" : -70,
		"offsetX" : -57,
		"hide" : true
	});
	
	var text = guiFactory.createObject("GuiLabel", {
		"parent" : this.backgroundState.mask,
		"style" : "gameButton victoriana-white-unboredered",
		"text" : Resources.getString("loading") + "...",
		"fontSize" : 35,
		"y" : "50%",
		"x" : "50%",
		"width" : 500, 
		"height" : 50,
		"offsetX" : -250,
		"offsetY" : 90,
		"align" : "center",
		"hide" : true
	});

	this.backgroundState.addGui(logo);
	this.backgroundState.addGui(text);
	
	this.backgroundState.textLogo = text;
	
	this.turnOnMaskLogo = function(on) {
		if (!!on) {
			logo.show();
			text.show();
		} else {
			logo.hide();
			text.hide();
		}
	};
	

//    Physics.createWorld(new b2Vec2(0, 10), true, PHYSICS_RATIO);
};

CannonsAndSoldiersAccount.prototype.switchState = function(stateName, id,
		parentId, noFadeIn) {
	var that = this;
	var actualSwitch = function() {
		var data = new Object();
		$['each'](Account.instance.states, function(key, value) {
			if (key === stateName) {
				data = Account.instance.states[key];
				data[key]["parent"] = parentId;
				data[id] = {
					"destroy" : true
				};
				that.readGlobalUpdate(data);
			}
		});
	};
	if(!noFadeIn) {
		this.backgroundState.fadeIn(LEVEL_FADE_TIME*1.25, "#83D1FA", actualSwitch);	
	} else {
		actualSwitch();
	}
	
};
//
//	Level Menu State represents levels select menu with buttons
//	to select the level
//

var LVL_MENU_GUI_JSON = UI?UI.LevelMenu:"resources/ui/LevelMenu.json";
var LEVEL_DESCRIPTION = "resources/levels/";
var REPLY = false;
var LVL_INDEX = 0;
var TRUE_LVL_INDEX = 0;
var LAST_LEVEL = 27;

LevelMenuState.prototype = new BaseState();
LevelMenuState.prototype.constructor = LevelMenuState;

/**
 * @constructor
 */
function LevelMenuState() {
	if (!UI)
		this.preloadJson(LVL_MENU_GUI_JSON);
	LevelMenuState.parent.constructor.call(this);
};

LevelMenuState.inheritsFrom(BaseState);

LevelMenuState.prototype.className = "LevelMenuState";
LevelMenuState.prototype.createInstance = function(params) {
	var entity = new LevelMenuState();
	entity.activate(params);
	return entity;
};
entityFactory.addClass(LevelMenuState);

LevelMenuState.prototype.jsonPreloadComplete = function() {
	LevelMenuState.parent.jsonPreloadComplete.call(this);
};

LevelMenuState.prototype.init = function(params) {
	LevelMenuState.parent.init.call(this, params);
	var that = this;

	if (REPLY) {
		setTimeout(function(){
			Account.instance.switchState("GameState01", that.id, that.parent.id, true);
		},100);
		return;
		// console.log(Account.instance);

	} else {
		if (UI) {		
			var objects = cloneObject(LVL_MENU_GUI_JSON);		
		} else {
			objects = this.resources.json[LVL_MENU_GUI_JSON];
		}
		guiFactory.createGuiFromJson(objects, this);

		// Adds and binds level select buttons
		var levelButtons = [];
		function createLvlButtons(i, j) {
			var unlocked = (SCORE['level_' + (levelButtons.length-1)] > 0)
					|| (levelButtons.length == 0);
//			unlocked = true;
			var guiBtn = guiFactory
					.createObject(
							"GuiButton",
							{
								"parent" : that.getGui("menuContainer"),
								"normal" : {
									"image" : unlocked ? "FinalArt/Menu/LevelSelect/NumberCell001.png"
											: "FinalArt/Menu/LevelSelect/Level_Locked.png",
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : unlocked ? levelButtons.length + 1
												: "",
										"fontSize" : 30,
										"color" : "#01B5FF",
										"y" : "60%"
									}
								},
								"hover" : {
									"image" : unlocked ? "FinalArt/Menu/LevelSelect/NumberCell001.png"
											: "FinalArt/Menu/LevelSelect/Level_Locked.png",
									"scale" : 115,
									"label" : {
										"style" : "gameButton victoriana-normal",
										"text" : unlocked ? levelButtons.length + 1
												: "",
										"fontSize" : 30,
										"color" : "#01B5FF"
									}
								},
								"style" : "gameButton",
								"width" : 60,
								"height" : 79,
								"x" : j * (60 + 30) + 90,
								"y" : i * (79 +9) + 30,
								"i" : i + j * i,
								"unlocked" : !!unlocked
							});

			that.getGui("menuContainer").addGui(guiBtn, levelButtons.length);

			guiBtn.bind(function(e) {
				if (!guiBtn.params["unlocked"])
					return;
				LVL_INDEX = levelButtons.indexOf(guiBtn);
				var lvl_index = (levelController && (levelController[LVL_INDEX] || levelController[LVL_INDEX] === 0))?levelController[LVL_INDEX]:LVL_INDEX;
				TRUE_LVL_INDEX = lvl_index;
				LEVEL_DESCRIPTION = "resources/levels/" + lvl_index + ".json";
				Sound.play("click");
				Account.instance.switchState("GameState01", that.id,
						that.parent.id);
				SG_Hooks.selectLevel(LVL_INDEX+1);
				SG_Hooks.levelStarted();
			});

			//guiBtn.clampByParentViewport(true);
			levelButtons.push(guiBtn);
		}
		for ( var i = 0; i < 4; i++)
			for ( var j = 0; j < 7; j++)
				createLvlButtons(i, j);

		var menuButton = this.getGui("menu");
		menuButton.bind(function(e) {
			Sound.play("click");
			Account.instance
					.switchState("MenuState01", that.id, that.parent.id);
		});

		var totalScore = 0;
		$['each'](SCORE, function(id, levelScore) {
			totalScore += levelScore * 1;
		});

		var score = this.getGui("score");
		score.children.guiEntities[1].change(totalScore);

		if (Loader['loadingMessageShowed']()) {
			Account.instance.backgroundState.fadeIn(
					REPLY ? 0 : LEVEL_FADE_TIME, "#83D1FA", function() {
						Account.instance.backgroundState.fadeOut(REPLY ? 0
								: LEVEL_FADE_TIME);
						Loader['hideLoadingMessage']();
						$(window)['trigger']("resize");
					});
		} else {
			Account.instance.backgroundState.fadeOut(REPLY ? 0
					: LEVEL_FADE_TIME, function() {
				$(window)['trigger']("resize");
			});
		}

		// loadGame();
	}
};
//
//	Main Menu State represents main menu with buttons
//	(such as "Play", "Highscores, Sound on/off", "Help")
//

var MENU_GUI_JSON = UI?UI.mainMenu:"resources/ui/mainMenu.json";
var CREDITS_JSON = UI?UI.credits:"resources/ui/credits.json";
var DESCRIPTIONS_JSON = UI?UI.objectsDescription:"resources/objectsDescription.json";

DEFAULT_B2WORLD_RATIO = 30;

MenuState.prototype = new BaseState();
MenuState.prototype.constructor = MenuState;

/**
 * @constructor
 */
function MenuState() {
	if (!UI){
		this.preloadJson(MENU_GUI_JSON);
		this.preloadJson(CREDITS_JSON);
		this.preloadJson(DESCRIPTIONS_JSON);
	}

	if (!Account.instance.mediaPreloaded) {
		// preloading fonts
		Resources.preloadFonts([ "victoriana-normal" ]);

		Sound.init("sounds/total", true);
		Sound.add("click", 2, 0.5, "sounds/total", 9);
		Sound.add("change", 4, 0.5, "sounds/total");
		Sound.add("shot", 20, 2, "sounds/total");
		Sound.add("explosionL", 30, 2, "sounds/total", 10);
		Sound.add("wood", 20, 2, "sounds/total", 9);
		Sound.add("stone", 20, 2, "sounds/total", 9);
		Sound.add("metal", 37, 0.8, "sounds/total", 9);
		Sound.add("bubble", 35, 0.2, "sounds/total");
		

//		Sound.add("whistle", 38, 0.534, "sounds/total");
//		Sound.add("birdsChoir", 41, 0.911, "sounds/total");
		Sound.add("birdYellow", 41, 0.518, "sounds/total", 8);
//		Sound.add("fire", 42, 1, "sounds/total");
//		Sound.add("hit", 43.5, 0.3, "sounds/total");
//		
		Sound.add("woodCrack2", 45, 0.3, "sounds/total", 9);
//		Sound.add("stoneCrack", 46, 0.25, "sounds/total");
		Sound.add("metalCrack", 44, 0.6, "sounds/total", 9);
		Sound.add("groundCrack", 47, 0.41, "sounds/total", 9);
//		Sound.add("woodCrack2", 48, 0.56, "sounds/total");
		Sound.add("punch3", 49, 0.43, "sounds/total", 9);
//		
//		Sound.add("level_win", 50, 1.11, "sounds/total");
//		Sound.add("level_fail",52, 1, "sounds/total");
		

		Sound.init("sounds/total2", true);
		Sound.add("birdRed", 0, 0.625, "sounds/total2", 8);
//		Sound.add("birdRed2", 1, 0.309, "sounds/total2");
		Sound.add("birdBlue1", 2, 0.171, "sounds/total2", 8);
		Sound.add("birdBlue2", 3, 0.154, "sounds/total2", 8);// accelerate()
//		Sound.add("birdGreen", 4, 0.344, "sounds/total2");
		Sound.add("birdOrange1", 5, 0.218, "sounds/total2", 8);
//		Sound.add("birdOrange2", 6, 0.290, "sounds/total2");
//		Sound.add("birdOrange2", 7, 0.391, "sounds/total2");
		Sound.add("birdGreen", 9, 0.299, "sounds/total2", 8);
		
		Sound.add("explosionS", 10, 0.893, "sounds/total2", 10);
//		Sound.add("explosionS", 11, 0.773, "sounds/total2");

		Sound.add("woodCrack1", 23, 1.187, "sounds/total2", 9);
//		Sound.add("woodCrack2", 25, 0.812, "sounds/total2");
//		Sound.add("woodCrack2", 26, 0.667, "sounds/total2");
		Sound.add("stoneCrack", 22, 0.687, "sounds/total2", 9);
//		Sound.add("metalCrack", 13, 1.021, "sounds/total2");
//		Sound.add("groundCrack", 12, 0.655, "sounds/total2");
		Sound.add("punch1", 15, 0.411, "sounds/total2", 9);
//		Sound.add("punch2", 16, 0.560, "sounds/total2");
//		Sound.add("punch3", 17, 0.563, "sounds/total2");
		Sound.add("punch2", 18, 0.634, "sounds/total2", 9);
//		Sound.add("punch5", 19, 0.445, "sounds/total2");
//		Sound.add("punch6", 20, 0.5, "sounds/total2");
//		Sound.add("punch3", 21, 0.541, "sounds/total2");

		Sound.add("level_win1", 31, 3.530, "sounds/total2", 10);
//		Sound.add("level_win2", 35, 2.905, "sounds/total2");
		Sound.add("level_fail",27, 3.424, "sounds/total2", 10);

		Sound.add("poof1", 39, 0.636, "sounds/total2", 8);
		Sound.add("poof2", 40, 1.041, "sounds/total2", 8);

		Sound.add("birdBlack1",42, 0.32, "sounds/total2", 8);
		Sound.add("birdBlack2",43, 0.458, "sounds/total2", 8);
//		Sound.add("birdBlack3",44, 0.323, "sounds/total2");

//		Sound.add("punch8",45, 0.411, "sounds/total2");
//		Sound.add("punch9",46, 0.204, "sounds/total2");

		Sound.add("rubberShot",47, 0.437, "sounds/total2", 5);
		
		Sound.add("rubber",48, 0.335, "sounds/total2", 5);

	}

	MenuState.parent.constructor.call(this);
};

MenuState.inheritsFrom(BaseState);

MenuState.prototype.className = "MenuState";
MenuState.prototype.createInstance = function(params) {
	var entity = new MenuState();
	entity.activate(params);
	return entity;
};
entityFactory.addClass(MenuState);



MenuState.prototype.jsonPreloadComplete = function() {
	if (!Account.instance.mediaPreloaded) {
		
		if (UI) {		
			var descr = cloneObject(DESCRIPTIONS_JSON);		
		} else {
			descr = this.resources.json[DESCRIPTIONS_JSON];
		}
		$['each'](descr, function(key, value) {
			$['each'](value.visuals, function(key, value) {
				if (value["totalImage"]) {
					mediaArray.push(value["totalImage"]);
				}
			});
		});

		Account.instance.mediaPreloaded = true;
	}

	MenuState.parent.jsonPreloadComplete.call(this);
};

MenuState.prototype.init = function(params) {

	MenuState.parent.init.call(this, params);
	if (UI) {		
		var objects = cloneObject(MENU_GUI_JSON);		
	} else {
		objects = this.resources.json[MENU_GUI_JSON];
	}
	guiFactory.createGuiFromJson(objects, this);
	
	
	var enhancedScene = this.getGui("enhancedScene");
	
	if (UI) {		
		var objects2 = cloneObject(CREDITS_JSON);		
	} else {
		objects2 = this.resources.json[CREDITS_JSON];
	}
	guiFactory.createGuiFromJson(objects2, this);
	// if (Sound.isOn()) {
	// 	this.getGui("soundOff").hide();
	// 	this.getGui("soundOn").show();
	// } else {
	// 	this.getGui("soundOn").hide();
	// 	this.getGui("soundOff").show();
	// }

	var that = this;

	function onLanguageChange() {
		//that.getGui("play").changeLabel(Resources.getString("play"));
		//that.getGui("langBack").changeLabel(Resources.getString("back"));
		//that.getGui("changeLang").changeLabel(Resources.getString("language"));
		//that.getGui("fullScreen").changeLabel(Resources.getString("fullScreen"));
		//that.getGui("moreGames").changeLabel(Resources.getString("moreGames"));
		//that.getGui("mainFlag").setBackground("images/" + Resources.getString("flag"));
		//that.getGui("mainFlag").resize();
		// for (var i = 0; i < that.langButtons.length; i++) {
		// 	that.langButtons[i].onLanguageChange();
		// }
        //Account.instance.backgroundState.textLogo.change(Resources.getString("loading") + "...");
	};
	
	var btn = this.getGui("play");
	btn.bind(function(e) {
		Sound.play("click");
		Account.instance.switchState("LevelMenuState01", that.id,
				that.parent.id);
		didClickedPlay();

	});
	
	// var btn = this.getGui("moreGames");
	// btn.bind(function(e) {
	// 	Sound.play("click");
	// 	window.open( "http://m.softgames.de", "_blank" ) 
	// });
	
	// var btn = this.getGui("changeLang");
	// btn.bind(function(e) {
	// 	Sound.play("click");
	// 	langScroll.resizeScroll();
	// 	that.getGui("dialogLanguage").resize();
	// 	that.getGui("dialogLanguage").show();
	// 	langScroll.refresh();
	// });
	
	var btn = this.getGui("fullScreen");
	btn.bind(function(e) {
		toggleFullScreen();
//		if (screenfull && screenfull.enabled) {
//		    screenfull.toggle();
//		}
	});
	
	if (!Device.isMobile() || navigator.userAgent.indexOf('Chrome') === -1) {
		btn.hide();
	}
	
	// var btn = this.getGui("langBack");
	// btn.bind(function(e) {
	// 	Sound.play("click");
	// 	that.getGui("dialogLanguage").hide();
	// });
	
	// var langScroll = that.getGui("langScroll");
	var langs = [
	             {
	            	 lang : 'EN',
	            	 text : "en",
	            	 flag : "United_Kingdom.png",
	             },
	             {
	            	 lang : 'RU',
	            	 text : "ru",
	            	 flag : "Russia.png",
	             },
	             {
	            	 lang : 'FR',
	            	 text : "fr",
	            	 flag : "France.png",
	             },
	             {
	            	 lang : 'IT',
	            	 text : "it",
	            	 flag : "Italy.png",
	             },
	             {
	            	 lang : 'ES',
	            	 text : "es",
	            	 flag : "Spain.png",
	             },
	             {
	            	 lang : 'DE',
	            	 text : "de",
	            	 flag : "Germany.png",
	             },
	             {
	            	 lang : 'TR',
	            	 text : "tr",
	            	 flag : "turkey.png",
	             },
	             {
	            	 lang : 'PT',
	            	 text : "pt",
	            	 flag : "Portugal.png",
	             }
             ];

	//langScroll.setFixedHeight(langs.length * 90);
	//this.langButtons = [];
/*
	for (var i = 0; i < langs.length; i++) {
		var mainDiv = guiFactory.createObject("GuiDiv", {
			"parent" : this.getGui("langScroll"),
			"style" : "dialog",
			"width" : 100,
			"height" : 67,
			"x" : 10,
			"y" : 10 + 90*i
		});
		
		var button = guiFactory.createObject("GuiButton", {
			"parent" : mainDiv,
			"normal" : {
				"image" : "FinalArt/Menu/Main/Button1.png",
				"label" : {
					"style" : "gameButton victoriana-normal",
					"text" : langs[i].text,
					"fontSize" : 35,
					"y" : "45%",
					"color" : "#753424"
				}
			},
			"hover" : {"image" : "FinalArt/Menu/Main/Button1.png",
						"scale" : 110,
				"label" : {
				}},
			"style" : "dialog",
			"width" : 250,
			"height" : 67, 
			"x" : 117,
			"y" : 0
		});
		
		var flag = guiFactory.createObject("GuiDiv", {
			"parent" : mainDiv,
			"background": {
				"image" : langs[i].flag
			},
			"style" : "dialog",
			"width" : 92,
			"height" : 67,
			"x" : 0,
			"y" : 0,
			"offsetY" : 0
		});

		mainDiv.addGui(button);
		mainDiv.addGui(flag);
		
		langScroll.addListItem(mainDiv);
		langScroll.refresh();
		
		(function bind(ln, txt) {
			button.buttonText = txt;
			button.bind(function(e) {
				Sound.play("click");
				Resources.setLanguage(ln);
				setTimeout(function() {
					onLanguageChange();
					that.getGui("dialogLanguage").hide();
				},500);
			});	
		})(langs[i].lang, langs[i].text);
		
		button.onLanguageChange = function() {
			this.changeLabel(Resources.getString(this.buttonText));
		}
		
		this.langButtons.push(button);
	}*/
	
	
	var btn = this.getGui("highscores");
	btn.bind(function(e) {

	});

	// var btn = this.getGui("soundOn");
	// btn.bind(function(e) {
	// 	Sound.turnOn(false);
	// 	that.getGui("soundOn").hide();
	// 	that.getGui("soundOff").show();
	// });

	// var btn = this.getGui("soundOff");
	// btn.bind(function(e) {
	// 	Sound.turnOn(true);
	// 	that.getGui("soundOff").hide();
	// 	that.getGui("soundOn").show();
	// 	Sound.play("click");
	// });

	// Credits Dialog

	var creditsDialog = this.getGui("creditsDialog");
	//var creditsButton = this.getGui("help");
	/*creditsButton.bind(function(e) {
		// circle.hide();
		// logo.hide();
		creditsDialog.show();
		that.scroll.refresh();
		e.preventDefault();
		Sound.play("click");
	});

	var resume = this.getGui("resume");
	resume.bind(function(e) {
		Sound.play("click");
		// circle.show();
		// logo.show();
		creditsDialog.hide();
	});*/

	var src = "<span id='creditsLabel'>"
			+ "<br><br><br><br><b><big>Yuri Dobronravin "
			+ "<br><br>Victor Kurochkin"
			+ "<br><br>Sergey Danysh"
			+ "<br><br> Andrew Zakolyukin</b> "
			+ "<br><br><br><b>SOUNDS</b>"
			+ "<br><i>Irina Chaban - universemusic.com.ua</i>"
			+ "<br><i>&</i>"
			+ "<br><i>from Freesound.org</i>"
			// new s
			+ "<br><br>Cartoon_Punch_04.wav <br><i>by RSilveira_88</i>"
			+ "<br><br>Wood_Hit_01.wav <br><i>by dheming</i>"
			+ "<br><br>Body fall in grass CLOSE.mp3 <br><i>by J.Zazvurek</i>"
			+ "<br><br>stone_on_stone.aif <br><i>by thanvannispen</i>"
			+ "<br><br>Metal hit with metal bar resonance <br><i>by jorickhoofd</i>"
			+ "<br><br>Hits on wood <br><i>by Aiwha</i>"
			+ "<br><br>Whip Birds <br><i>by abcopen</i>"
			+ "<br><br>lakeside birds 2.wav <br><i>by jus</i>"
			+ "<br><br>Birds in aviary.wav <br><i>by bunting</i>"
			+ "<br><br>dinobird.wav <br><i>by base_trix</i>"
			+ "<br><br>pig oinks.wav <br><i>by braffe2</i>"
			// all
			+ "<br><br>Button Click.wav <br><i>by KorgMS2000B</i>"
			+ "<br><br>Rubber_squeaks.aif <br><i>by kbnevel</i>";

	this.scroll = this.getGui("scroll");

	this.scroll.setFixedHeight(1150);
	// hacky thing for IE9 to make scrollable even empty space
	// var backMask = this.getGui("backMask");
	var logicking = this.getGui("logicking");
	var textLabel = this.getGui("text");
	textLabel.append(src);
	textLabel.align("center");
	this.scroll.addListItem(logicking);
	this.scroll.addListItem(textLabel);
	// this.scroll.addListItem(backMask);
	this.scroll['refresh'];

	setTimeout(function() {
		Account.instance.resize();
		onLanguageChange();
	},1500);
	
	setTimeout(function(){
		that.getGui("fullScreen").resize();
		onLanguageChange();
		if (Loader['loadingMessageShowed']()) {
			Account.instance.backgroundState.fadeIn(LEVEL_FADE_TIME, "#83D1FA",
					function() {
						Loader['hideLoadingMessage']();
						enhancedScene.show();
						$(window)['trigger']("resize");
						setTimeout(function() {
							Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME);
							setTimeout(function() {
								Account.instance.turnOnMaskLogo(true);
							},500);
						},500);
					});
		} else {
			enhancedScene.show();
			Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME, function() {
				$(window)['trigger']("resize");
			});
		}
	},100);
	// loadGame();
};
/*
 * Block - destructable PhysicsEntity representing stone 
 * block from which castles are built
 */

Block.prototype = new PhysicEntity();
Block.prototype.constructor = Block;

/**
 * @constructor
 */
function Block() {
	Block.parent.constructor.call(this);
};

Block.inheritsFrom(PhysicEntity);
Block.prototype.className = "Block";

Block.prototype.createInstance = function(params) {
	var entity = new Block();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Block);

Block.prototype.init = function(params) {
	Block.parent.init.call(this, params);
	this.started = false;
};

Block.prototype.createPhysics = function () {
	Block.parent.createPhysics.call(this);
}

Block.prototype.createVisual = function() {
	var that = this;
	var description = Account.instance.descriptionsData[this.params.type];
	this.angle = 0;

	$['each'](description.visuals, function(id, visualInfo) {
		var gui = guiFactory.createObject(visualInfo['class'], $.extend({
			'parent' : that.guiParent,
			"canvas" : that.parent.getCanvas(),
			'style' : "sprite",
			'x' : that.params.x,
			'y' : that.params.y
		}, visualInfo));
		gui.setZ(gui.params.z);
		if (gui.setTransformOrigin && description.physics) {
			gui.setTransformOrigin({
				x : (description.physics.x + description.physics.width/2)/visualInfo.width,
				y : (description.physics.y + description.physics.height/2)/visualInfo.height
			});
		}

		var resInfo = {};
		resInfo.visual = gui;
		that.addVisual(id, resInfo);
	});
};

Block.prototype.onDamage = function(damage) {
	var that = this;
	var healthBefore = this.health;
	Block.parent.onDamage.call(this, damage);
	var healthAfter = this.health;
    var score = healthBefore - healthAfter;
    if (!isNaN(score))
    	this.parent.score += score * GAME_BALANCE['Block'].DAMAGE_TO_SCORE_RATIO;
	
	var scoreCell = that.parent.parent.getGui("score");
	scoreCell.children.guiEntities[1].change(that.parent.score.toFixed(0));
};

// Plays an animation from table, if such exists
Block.prototype.destroy = function() {
	var bigDestruction = this.parent.getChild("BigBlockDestruction");
	var smallDestruction = this.parent.getChild("SmallBlockDestruction");
	var effectPosition = {
		"x" : this.x+9,
		"y" : this.y+5
	};
	switch (this.params.type) {
	case "BigBlock_1":
		bigDestruction.play(effectPosition);
		break;
	case "BigBlock_2":
		bigDestruction.play(effectPosition);
		break;
	case "BigBlock_3":
		bigDestruction.play(effectPosition);
		break;
	case "SmallBlock_1":
		smallDestruction.play(effectPosition);
		break;
	case "SmallBlock_2":
		smallDestruction.play(effectPosition);
		break;
	case "SmallBlock_3":
		smallDestruction.play(effectPosition);
		break;
	case "WindowBlock":
		bigDestruction.play(effectPosition);
		break;
	default:
		break;
	}
	Block.parent.destroy.call(this);
};

Block.prototype.update = function() {
	if (this.started === false && this.parent.started === true) {
		this.setContactBeginCallback(this.onHit);
		this.started = true;
	}
}

Block.prototype.onHit = function(contact, other) {
	if (!other || !other.physics)
		return;
	var power;
	if (other.material === "ground")
		power = GAME_BALANCE['Block'].GROUND_HIT_POWER;
	else if (other.destructable)
		power = GAME_BALANCE['Block'].SELF_HIT_POWER;
	else 
		return;

	var impulse1 = this.physics.GetMass() * Math.pow(this.physics.GetLinearVelocity().Length(), 2);
	var impulse2 = other.physics.GetMass() * Math.pow(other.physics.GetLinearVelocity().Length(), 2);

	var damage = (impulse2 + impulse1) * power * GAME_BALANCE['Block'].SELF_DESTR_RATIO;
	if (other.destructable)
		other.onDamage(damage);
	this.onDamage(damage);
}/**
 * Effect represents visual, sound etc effects
 */

var IEffect = (function() {
	return {
		play : function(gui, params, duration) {
			var slide = false;
			if (params.slide) {
				slide = {
						"x" : params.slide.x,
						"y" : params.slide.y
				};
			}

			var rotate = false;
			if (params.rotate) {
				rotate = params.rotate;
			}
			
			var onEnd = false;
			if (params.onEnd)
				onEnd = params.onEnd;
			
			var scale = false;
			if (params.scale) {
				scale = params.scale;
			}
			
			var iterations = params.iterations ? params.iterations : 20;
			var iteration = 0;
			function process() {
				setTimeout(function(){
					if (slide) {
						gui.x += slide.x/iterations;
						gui.y += slide.y/iterations;
					};
					if (rotate) {
						gui.rotate(rotate/iterations);
					};
					gui.resize();
					if (iteration >= iterations-1) {
						if (onEnd) onEnd();
						return;
					}
					else { 
						iteration += 1;
						process();
					}

				}, duration/iterations);
			}
			process();
		}
	};
})();/*
 *  Soldier class represents an soldier (cap?)
 *  with it`s physics, animation and logic part
 *  (detecting GameOver, changing animation picture etc)
 */

var DEATH_DELAY = 1000;
var MIN_SCREAM_DAMAGE = 3;

Soldier.prototype = new Block();
Soldier.prototype.constructor = Soldier;

/**
 * @constructor
 */
function Soldier() {
	Soldier.parent.constructor.call(this);
};

Soldier.inheritsFrom(Block);
Soldier.prototype.className = "Soldier";

Soldier.prototype.createInstance = function(params) {
	var entity = new Soldier();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Soldier);

Soldier.prototype.init = function(params) {
	this.normalLife = 15;
	if (params.type === "EnemySoldierStrong")
		this.normalLife = 30;
	Soldier.parent.init.call(this, params);
	this.oldAngle = 0;
	this.dead = false;
	this.type = "enemy";
};

Soldier.prototype.createVisual = function() {
	Soldier.parent.createVisual.call(this);
	this.refreshFace("normal");
};

Soldier.prototype.refreshFace = function(state) {
	var that = this;
	if (!state) {
		if (that.health > 0)
			state = "normal";
		else
			state = 'dead';
	}
	this.state = state;
	switch (state) {
	case "dead":
		that.dead = true;
		that.visuals["soldier"].visual.playAnimation("dead", 50, false, true);
		break;
	case "normal":
		if (that.health > that.normalLife)
			that.visuals["soldier"].visual.playAnimation("normal", 50, false,
					true);
		else if (that.health > 0)
			that.visuals["soldier"].visual.playAnimation("beated", 50, false,
					true);
		else
			that.visuals["soldier"].visual.playAnimation("dead", 50, false,
					true);
		that.dead = false;
		break;
	case "happy":
		if (that.health > that.normalLife)
			that.visuals["soldier"].visual.playAnimation("normal", 50, false,
					true);
		else if (that.health > 0)
			that.visuals["soldier"].visual.playAnimation("beated", 50, false,
					true);
		else
			that.visuals["soldier"].visual.playAnimation("dead", 50, false,
					true);
		break;
	default:
		break;
	}
};

// Plays an animation from table, if such exists
Soldier.prototype.destroy = function() {
//	var that = this;
	if (!this.health > 0) {
		this.parent.getChild("BallExplosion").play({
			"x" : this.x + this.visuals["soldier"].visual.width/2,
			"y" : this.y + this.visuals["soldier"].visual.height/2
		});
		this.parent.onEnemyDied(this);
		Sound.play("bubble");
	}
	Soldier.parent.destroy.call(this);
};

Soldier.prototype.onDamage = function(damage) {
	if (damage > MIN_SCREAM_DAMAGE && this.health > 0)
		this.scream();
	Soldier.parent.onDamage.call(this, damage);
	this.refreshFace();
};

Soldier.prototype.scream = function() {
	var rand = Math.round(Math.random() * 2 + 1);
	Sound.play("punch" + rand);
};/*
 * Ground - static physics zone that acts like ground
 */

Ground.prototype = new PhysicEntity();
Ground.prototype.constructor = Ground;

/**
 * @constructor
 */
function Ground() {
	Ground.parent.constructor.call(this);
};

Ground.inheritsFrom(PhysicEntity);
Ground.prototype.className = "Ground";

Ground.prototype.createInstance = function(params) {
	var entity = new Ground();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Ground);

Ground.prototype.init = function(params) {
	Ground.parent.init.call(this, params);
	this.material = "ground";
};

Ground.prototype.createVisual = function() {};

/*
 * Block - destructable PhysicsEntity representing stone 
 * block from which castles are built
 */

Constraint.prototype = new PhysicEntity();
Constraint.prototype.constructor = Constraint;

/**
 * @constructor
 */
function Constraint() {
	Constraint.parent.constructor.call(this);
};

Constraint.inheritsFrom(PhysicEntity);
Constraint.prototype.className = "Constraint";

Constraint.prototype.createInstance = function(params) {
	var entity = new Constraint();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Constraint);

Constraint.prototype.createPhysics = function () {
	Constraint.parent.createPhysics.call(this);
    this.setContactBeginCallback(this.onHit);
    this.material == "constraint";
}

Constraint.prototype.createVisual = function () {
}

Constraint.prototype.onHit = function(contact, other) {
	if (!other || other.material === "ground")
		return;
	if (other.destructable)
		other.onDamage(9999);
	else if (other.type === "bomber" && other.children && other.children.length !== 0) {
		other.destroyPhysics();
		other.hide();
	} else
		Account.instance.removeEntity(other.id);
}/**
 * BattleScene is the main battlefield scene, witch drives all in game entities
 * and events
 */
var LevelResult = {
	'none' : 0,
	'won' : 1,
	'lost' : 2
};

BattleScene.prototype = new PhysicScene();
BattleScene.prototype.constructor = BattleScene;

/**
 * @constructor
 */

function BattleScene() {
	BattleScene.parent.constructor.call(this);
};

BattleScene.inheritsFrom(PhysicScene);

BattleScene.prototype.className = "BattleScene";
BattleScene.prototype.createInstance = function(params) {
	var entity = new BattleScene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(BattleScene);

BattleScene.prototype.init = function(params) {
	this.newUpdate = true;
	var world = Physics.getWorld();
	BattleScene.parent.init.call(this, params);
	this.levelResult = LevelResult.none;
	this.waitsForFinish = false;
	this.score = 0;
	this.cannon = null;
	this.enemies = null;
	this.started = false;
};

BattleScene.prototype.createVisual = function() {
	BattleScene.parent.createVisual.call(this);
	var that = this;

	this.setBackgrounds({
		"background" : {
			"src" : "images/FinalArt/Backgrounds/background_new.jpg",
			"backX" : 0,
			"backY" : 0,
			"backWidth" : 1138,
			"backHeight" : 640
		}
	}, this.parent.getGui("enhancedScene"));

	this.cannon = this.getCannon();
	this.enemies = this.getEnemies();

	// Bind events
	this.cannon.bind(Device.event("cursorDown"), function() {
		that.cannon.startNavigation();
	});
	this.parent.getGui("enhancedScene").jObject['bind'](Device
			.event("cursorMove"), function(e) {
		var pos = Device.getLogicPositionFromEvent(e);
		that.cannon.navigate(pos);
	});
	this.parent.getGui("enhancedScene").jObject['bind'](Device
			.event("cursorUp"), function() {
		that.cannon.shoot();
	});
	this.parent.getGui("enhancedScene").jObject['bind'](Device
			.event("cursorDown"), function() {
		if (that.cannon.getState() == CannonState.fired)
			that.cannon.alterFire();
	});
	this.resize();
	this.setTimeout(function() {
		that.cannon.load()
	}, GAME_BALANCE['BattleScene'].CANNON_FIRST_LOAD_DELAY);
	Physics.pause(false);

	// Physics.setDebugModeEnabled(true);
	// Physics.debugDrawing(true);
};

BattleScene.prototype.update = function(dt) {
	// BattleScene.parent.update.call(this, dt);
	if (this.finished)
		return;
	if (this.waitsForFinish === true) {
		if (Physics.getCalm() === false)
			return;
		this.levelResult = this.checkResult();
		if (this.levelResult !== LevelResult.none)
			this.finishLevel();
		else {
			this.cannon.unlock();
			this.waitsForFinish = false;
			console.warn("Wait for finish triggered with no reason!");
		}
	}
};

BattleScene.prototype.checkResult = function() {
	if (this.enemies.length == 0)
		return LevelResult.won;
	if (this.cannon.isEmptyMagazine() && !this.cannon.getLoaded())
		return LevelResult.lost;
	return LevelResult.none;
};

BattleScene.prototype.onEnemyDied = function(enemy) {
	var that = this;
	var idx = this.enemies.indexOf(enemy);
	if (idx >= 0)
		this.enemies.splice(idx, 1);
	if (this.enemies.length == 0)
		this.waitForFinish(LevelResult.won);
};

BattleScene.prototype.onNothingLeftToFire = function() {
	this.waitForFinish();
};

BattleScene.prototype.waitForFinish = function(levelResult) {
	var that = this;
	this.cannon.lock();
	if (levelResult) {
		this.levelResult = levelResult;
		this.finishLevel();
	}
	this.waitsForFinish = true;
	this
			.setTimeout(
					function() {
						that.levelResult = that.checkResult() == LevelResult.won ? LevelResult.won
								: LevelResult.lost;
						that.finishLevel();
					}, GAME_BALANCE['BattleScene'].MAX_TIME_WAIT_FOR_FINISH);
};

BattleScene.prototype.finishLevel = function() {
	var state = this.parent;
	var that = this;
	if (this.finished)
		return;
	this.finished = true;
	if (this.levelResult == LevelResult.none)
		return;
	var nextBtn = state.getGui("endNextBtn");
	if (nextBtn) {
		(this.levelResult == LevelResult.won) ? nextBtn.show() : nextBtn.hide();
		if (LVL_INDEX == LAST_LEVEL)
			nextBtn.hide();
	}

	if (this.levelResult == LevelResult.won) {
		var oldScore = SCORE['level_' + (LVL_INDEX)];
		this.score += this.enemies.length * 50;
		this.parent.getGui("score").children.guiEntities[1].change(this.score
				.toFixed(0));
		this.score += this.cannon.getMagazine().length * 200;
		this.parent.getGui("score").children.guiEntities[1].change(this.score
				.toFixed(0));
		var newScore = this.score.toFixed();
		SCORE['level_' + LVL_INDEX] = oldScore ? Math.max(oldScore, newScore)
				: newScore;
		Device.setStorageItem("scores", JSON.stringify(SCORE));
		state.finalSound = "level_win1";
		state.won = true;
		state.points = newScore;

		// if (typeof(SG_Hooks)!='undefined' && SG_Hooks)
		// SG_Hooks.levelUp(LVL_INDEX+1, parseInt(newScore));
	} else {
		$['each'](this.enemies, function(id, enemy) {
			if (!enemy.dead) {
				enemy.DoNotUpdate = true;
				enemy.refreshFace("normal");
			}
		});
		state.finalSound = "level_fail";
		state.won = false;
		// if (typeof(SG_Hooks)!='undefined' && SG_Hooks)
		// SG_Hooks.gameOver(LVL_INDEX+1, parseInt(this.score));
	}

	var levelInfo = state.getGui("endGameMenu");

	state.getGui("endGameMenuLabel").change(
			(this.levelResult == LevelResult.won) ? "congratulations"
					: "oops_you_failed");
	if ((LVL_INDEX == LAST_LEVEL) && (this.levelResult == LevelResult.won))
		state.getGui("endGameMenuLabel").change("great_victory");

	this.setTimeout(function() {
		that.showLevelResult(state);
	}, GAME_BALANCE['BattleScene'].SHOW_RESULT_DELAY);
	return true;
};

BattleScene.prototype.showLevelResult = function(state) {
	var that = this;
	if (state.fimalSound)
		;
	Sound.play(state.finalSound);
	this.parent.getGui("endGameMenu").show();
	if (this.levelResult == LevelResult.won) {
		this.parent.showStars(this.score);
		if (typeof (SG_Hooks) != 'undefined' && SG_Hooks){
			SG_Hooks.levelUp(LVL_INDEX + 1, parseInt(this.score));
		}
	} else {
		this.parent.showStars(-1);
		if (typeof (SG_Hooks) != 'undefined' && SG_Hooks)
			SG_Hooks.gameOver(LVL_INDEX + 1, parseInt(this.score));
	}
	SG_Hooks.levelFinished();

};

BattleScene.prototype.resize = function() {
	BattleScene.parent.resize.call(this);

	var that = this;
	var visual = this.getVisual();
	if (this.children && this.children.length > 0) {
		this.getChild("LeftConstraint").setPhysicsPosition({
			x : visual.parent.viewRect.left - 10,
			y : 0
		});
		this.getChild("RightConstraint").setPhysicsPosition({
			x : visual.parent.viewRect.right + 5,
			y : 0
		});
	}
	if (this.cannon)
		this.cannon.resize();
};

BattleScene.prototype.getCannon = function() {
	var that = this
	for (var i = 0; i < this.children.length; i++)
		if (this.children[i].type == "cannon")
			return this.children[i];
	return null;
};

BattleScene.prototype.getEnemies = function() {
	var that = this
	var enemies = [];
	$['each'](this.children, function(id, child) {
		if (child.type == "enemy")
			enemies.push(child);
	});
	return enemies.length ? enemies : null;

};//
//	Game State. Main state of the game, represents nothing
//	but initializing and creating scene
//

var GAME_GUI_JSON = UI?UI.GameState:"resources/ui/GameState.json";

GameState.prototype = new BaseState();
GameState.prototype.constructor = GameState;

/**
 * @constructor
 */
function GameState() {
	GameState.parent.constructor.call(this);
};

GameState.inheritsFrom(BaseState);

GameState.prototype.className = "GameState";
GameState.prototype.createInstance = function(params) {
	var entity = new GameState();
	entity.activate(params);
	return entity;
};
entityFactory.addClass(GameState);

GameState.prototype.jsonPreloadComplete = function() {
	GameState.parent.jsonPreloadComplete.call(this);
};

GameState.prototype.init = function(params) {
	var that = this;
//	Screen.setDOMForced(Device.isAndroidStockBrowser());
//	Screen.setDOMForced(true);
	REPLY = false;

//	Screen.setDOMForced(false);
	var objects0 = cloneObject(OBJECTS_DESCRIPTION);		
	Account.instance.descriptionsData = objects0;	
	
	GameState.parent.init.call(this, params);


	// Loading level objects from selected level, loadin descriptions, etc
	var objects = cloneObject(GAME_GUI_JSON);		
	guiFactory.createGuiFromJson(objects, this);
	var levelObjects = cloneObject(_LEVELS[TRUE_LVL_INDEX]);		
	var effects = cloneObject(EFFECTS);

	// Creating scene visuals
	var battleField = this.getChild("Scene01");
	battleField.initChildren({"children" : $.extend(levelObjects, effects)});
	battleField.attachToGui(this.getGui("sceneContainer"), true);
	this.battleField = battleField;

	this.physicsBeforePause;
	
	this.setupUI();
	this.setupTutorial();
	

	if (Loader['loadingMessageShowed']()) {
		Account.instance.backgroundState.fadeIn(REPLY ? 0 : LEVEL_FADE_TIME, "#83D1FA",
				function() {
					Account.instance.backgroundState.fadeOut(REPLY ? 0 : LEVEL_FADE_TIME);
					Loader['hideLoadingMessage']();
					$(window)['trigger']("resize");
				});
	} else {
		Account.instance.backgroundState.fadeOut(REPLY ? 0 : LEVEL_FADE_TIME, function() {
			$(window)['trigger']("resize");
		});
	}
};

GameState.prototype.destroy = function() {
	GameState.parent.destroy.call(this);
	Physics.destroyWorld();
};

GameState.prototype.resize = function() {
	GameState.parent.resize.call(this);
	var scene = this.getChild("Scene01");
	scene.resize();
};

GameState.prototype.setupUI = function() {
	var that = this;
	
	if (Sound.isOn()) 
		this.getGui("soundOff").hide();
	else 
		this.getGui("soundOn").hide();

	
	this.getGui("endGameMenu").hide();
	this.getGui("levelInfo").children.guiEntities[1].change(LVL_INDEX + 1);
	
	function showMenu() {
		var gui = that.getGui("pauseMenu");
//		that.physicsBeforePause = Physics.paused();
		Physics.pause(true);
		gui.show();
		gui.playJqueryAnimation("open");
	}

	function hideMenu() {
		var gui = that.getGui("pauseMenu");
		gui.playJqueryAnimation("close", function() {
//			Physics.pause(that.physicsBeforePause);
			Physics.pause(false);
			gui.hide();
		});
	}
	this.getGui("pauseBtn").bind(function(e) {
		Sound.play("click");
		showMenu();
	});
	this.getGui("resume").bind(function(e) {
		Sound.play("click");
		hideMenu();
	});
	this.getGui("restart").bind(function(e) {
		REPLY = true;
		Sound.play("click");
		Account.instance.switchState("LevelMenuState01", that.id,
				that.parent.id);
	});
	this.getGui("menu").bind(function(e) {
		Sound.play("click");
		Account.instance.switchState("LevelMenuState01", that.id,
				that.parent.id);
	});
	// this.getGui("moreGames").bind(function(e) {
	// 	Sound.play("click");
	// 	window.open( "http://m.softgames.de", "_blank" ) 
	// });
	this.getGui("endMenuBtn").bind(function(e) {
		LVL_INDEX += 1;
		Sound.play("click");
		Account.instance.switchState("LevelMenuState01", that.id,
				that.parent.id);
		console.log(SCORE);
	});
	this.getGui("endReplyBtn").bind(function(e) {
		REPLY = true;
		Sound.play("click");
		Account.instance.switchState("LevelMenuState01", that.id,
				that.parent.id);
	});
	this.getGui("endNextBtn").bind(function(e) {
		Sound.play("click");
		REPLY = true;
		LVL_INDEX += 1;
		var lvl_index = (levelController && (levelController[LVL_INDEX] || levelController[LVL_INDEX] === 0))?levelController[LVL_INDEX]:LVL_INDEX;
		TRUE_LVL_INDEX = lvl_index;
		LEVEL_DESCRIPTION = "resources/levels/" + lvl_index + ".json";
		Account.instance.switchState("LevelMenuState01", that.id,
				that.parent.id);
		SG_Hooks.selectLevel(LVL_INDEX+1);
		SG_Hooks.levelStarted();
	});
	this.getGui("soundOn").bind(function(e) {
		Sound.turnOn(false);
		that.getGui("soundOn").hide();
		that.getGui("soundOff").show();
	});
	this.getGui("soundOff").bind(function(e) {
		Sound.turnOn(true);
		that.getGui("soundOff").hide();
		that.getGui("soundOn").show();
		Sound.play("click");
	});
};

GameState.prototype.setupTutorial = function() {
	var that = this;
	if ((LVL_INDEX == 0) || (LVL_INDEX == 4) || (LVL_INDEX == 8) ||
			(LVL_INDEX == 12) || (LVL_INDEX == 16) || (LVL_INDEX == 20))	{
		this.getGui("tutorialMenu").show();
		var tutorialLabel = this.getGui("tutorialMenuLabel");
		var tutorialFrame;
		switch (LVL_INDEX) {
			case 0 :
				tutorialLabel.change("take_a_shot");
				tutorialFrame = this.getGui("tutorialFrame_0");
				break;
			case 4 :
				tutorialLabel.change("accelerator_tut");
				tutorialFrame = this.getGui("tutorialFrame_1");
				break;
			case 8 :
				tutorialLabel.change("bomb_tut");
				tutorialFrame = this.getGui("tutorialFrame_2");
				break;
			case 12 :
				tutorialLabel.change("bomber_tut");
				tutorialFrame = this.getGui("tutorialFrame_3");
				break;
			case 16 :
				tutorialLabel.change("double_tut");
				tutorialFrame = this.getGui("tutorialFrame_4");
				break;
			case 20 :
				tutorialLabel.change("boomerang_tut");
				tutorialFrame = this.getGui("tutorialFrame_5");
				break;
			default :
				tutorialFrame = this.getGui("tutorialMenu");
				break;
		}
		tutorialFrame.show();
		tutorialFrame.playAnimation("tutorial", 3000, true, true);
		
		this.getGui("tutorialNext").hide();
		this.getGui("tutorialEnd").bind(function(e) {
			Sound.play("click");
			that.getGui("tutorialMenu").hide();
		});
	}
	else {
		this.getGui("tutorialMenu").hide();
	}
};

GameState.prototype.showStars = function(points) {
	var mainDiv = this.getGui("endGameStarDiv");
//	lvl = levelController[LVL_INDEX];
	lvl = LVL_INDEX;
	if (points > 0) {
		if (levelStarsController && levelStarsController[lvl] && levelStarsController[lvl].length > 1) {
			var stars = 1;
			if (points >= levelStarsController[lvl][1]) 
				stars = 2;
			if (points >= levelStarsController[lvl][2]) 
				stars = 3;
		} else {
			stars = 3;
		}

		
		var sts = [this.getGui("endGameStar1"),
		           this.getGui("endGameStar2"),
		           this.getGui("endGameStar3")];
		var stsNo = [this.getGui("endGameStar1No"),
		           this.getGui("endGameStar2No"),
		           this.getGui("endGameStar3No")];
		
		for (i = 0; i < 3; i++) {
			if ( i < stars) {
				sts[i].show();
				stsNo[i].hide();
			} else {
				sts[i].hide();
				stsNo[i].show();
			}
		}
		
		mainDiv.show();
	} else {
		mainDiv.hide();
	}
};
/**
 *
 * @param {{matrix, angle, scaleX, scaleY, translate}} transform
 */
GuiSprite.prototype.setTransform2 = function(transform) {
    if (transform) {
        if (transform.matrix != null)
            this.matrix = transform.matrix;
        if (transform.angle != null)
            this.angle = transform.angle;
        if (transform.scaleX != null)
            this.scaleX = transform.scaleX;
        if (transform.scaleY != null)
            this.scaleY = transform.scaleY;
        if (transform.translate != null)
            this.translate = transform.translate;
    }
    var scaleX = selectValue(this.scaleX, 1);
    var scaleY = selectValue(this.scaleY, 1);
    scaleX *= (this.flipped ? -1 : 1);

    cssTransform(this.jObject, this.matrix, this.angle, scaleX, scaleY,
        this.translate);
};
/**
 * vector linear interpolation
 * interpolate between two vectors.
 * @param {{x, y}} vecA
 * @param {{x, y}} vecB
 * @param value should be in 0.0f - 1.0f space ( just to skip a clamp operation )
 * @returns {{x: number, y: number}} vec
 */
MathUtils.lerp = function (vecA, vecB, value) {
    return {
        x: vecA.x + (vecB.x - vecA.x) * value,
        y: vecA.y + (vecB.y - vecA.y) * value
    };
};var CannonState = {
	empty : 0,
	loading : 2,
	loaded : 1,
	navigating : 3,
	fired	: 4,
	waitsToLoad : 5
};

Cannon.prototype = new VisualEntity();
Cannon.prototype.constructor = Cannon;

/**
 * @constructor
 */
function Cannon() {
    Cannon.parent.constructor.call(this);
};

Cannon.inheritsFrom(VisualEntity);
Cannon.prototype.className = "Cannon";

Cannon.prototype.createInstance = function (params) {
    var entity = new Cannon();
    entity.init(params);
    return entity;
};

entityFactory.addClass(Cannon);

Cannon.prototype.init = function (params) {
    Cannon.parent.init.call(this, params);
    this.ammoDescription = cloneObject(AMMO_DESC);;
    this.loaded = null;
    this.magazine = null;
    this.magazinePreview = null;
    this.state = CannonState.empty;
    this.locked = false;
    this.power = 0;
    this.direction = new b2Vec2(0, 1);
    this.barrelPlace = new b2Vec2(0, 0);
    this.pointCloudsPool = null;
    this.pointCloudsUsed = 0;
    this.type = "cannon";
    
	this.constraintedOffset = new b2Vec2(-3.038, 5.561);
	this.constraintedOffset.Normalize();
};

Cannon.prototype.createVisual = function () {
	var that = this;
	var description = Account.instance.descriptionsData[this.params.type];
	var mainGui = null;
	$['each'](description.visuals, function (id, visualInfo) {
        var gui = guiFactory.createObject(visualInfo['class'], $.extend({
            'parent': that.guiParent,
            'style': "sprite",
            'x': that.params.x,
            'y': that.params.y
        }, visualInfo));
        gui.setZ(gui.params.z);
        
        if (!mainGui) {
            mainGui = gui;
            gui.setPosition(gui.x, gui.y - 12);
        }
        else
            gui.setPosition(gui.x, gui.y + mainGui.y);
        if (visualInfo.visible == false)
            gui.hide();
        var resInfo = {};
        resInfo.visual = gui;
        that.addVisual(id, resInfo);
    });
	
	this.pointCloudsPool = this.createPointCloudsPool(GAME_BALANCE['Cannon'].CLOUD_POOL_SIZE);

	var nearWheel = this.getVisual("nearWheel");
    this.backRubberConnectionPosition = new b2Vec2(nearWheel.x + 26, nearWheel.y + 2);
    this.frontRubberConnectionPosition = new b2Vec2(nearWheel.x - 10, nearWheel.y);
	
    this.barrelPlace.Set(nearWheel.x + 26, nearWheel.y + 15);
    
    if (this.params['birds']) {
    	this.createMagazine(this.params['birds'], false, 0, mainGui.y);
    	this.createMagazinePreview();
    }
    
    this.updateSlingshot(nearWheel.getPosition(), new b2Vec2(nearWheel.width/4, 0), GAME_BALANCE['Cannon'].EMPTY_SLINGSHOT_ANGLE);
};

Cannon.prototype.navigate = function(point) {
	if (this.state !== CannonState.navigating || !this.loaded || !point || this.locked === true)
		return;
	
    var offset = b2Math.SubtractVV(point, this.barrelPlace);
    var oldPower = this.power * 1;
    
    this.power = Math.min(offset.Length() * GAME_BALANCE['Cannon'].POWER_RATIO , 1);
    
    this.power = this.power > GAME_BALANCE['Cannon'].MIN_POWER ? this.power : 0;
    if (oldPower <= GAME_BALANCE['Cannon'].MIN_POWER && this.power > GAME_BALANCE['Cannon'].MIN_POWER) {
    	this.setSlingShotVisible(true);
    	Sound.play("rubber");
    } else if (oldPower > GAME_BALANCE['Cannon'].MIN_POWER && this.power <= GAME_BALANCE['Cannon'].MIN_POWER)
    	this.setSlingShotVisible(false);
    
    offset = this.constraintSlingshot(offset);
    
    var radius = this.power * GAME_BALANCE['Cannon'].TARGET_DISTANCE;
    var newPos = offset.Copy();
    
    offset.Multiply(-1);
    this.direction = offset;
    
    newPos.Normalize();
    var leatherPadPos = newPos.Copy();
    newPos.Multiply(radius);
    newPos.Add(this.barrelPlace);
    this.loaded.setPhysicsPosition(newPos);
    
    leatherPadPos.Multiply(radius + GAME_BALANCE['Cannon'].LEATHER_PAD_DEPTH); // TODO: calculate value depending on ball.cannonBall.width?
    leatherPadPos.Add(this.barrelPlace);

    leatherPadPos.x -= this.loaded.getVisual('main').width / 3 + newPos.x;
    leatherPadPos.y -= this.loaded.getVisual('main').height / 4 + newPos.y;
    
    this.updateSlingshot(this.loaded.getPosition(), leatherPadPos);
};

Cannon.prototype.startNavigation = function() {
	if (this.locked === true)
		return;
	if (this.state === CannonState.loaded)
		this.state = CannonState.navigating;
};

Cannon.prototype.cancelNavigation = function() {
	if (this.state !== CannonState.navigating)
		return;
	this.loaded.setPhysicsPosition(this.barrelPlace);
	this.setSlingShotVisible(false);
	this.state = CannonState.loaded;
};

Cannon.prototype.shoot = function () {
	if (this.state !== CannonState.navigating || this.locked === true)
		return;
	if (this.power <= GAME_BALANCE['Cannon'].MIN_POWER) 
		return this.state = CannonState.loaded;
	this.resetPointCloudsPool();	
	this.loaded.launch(this.direction, this.power * GAME_BALANCE['Cannon'].POWER_RATING);
	if (this.parent.started === false)
		this.parent.started = true;
	this.loaded = null;
	this.power = 0;
	var nearWheel = this.getVisual("nearWheel");
	this.updateSlingshot(nearWheel.getPosition(), new b2Vec2(nearWheel.width/4, 0), GAME_BALANCE['Cannon'].EMPTY_SLINGSHOT_ANGLE);
	this.state = CannonState.fired;
};

Cannon.prototype.createMagazine = function (ammoList, autoLoad, x, y) {
	assert(ammoList && ammoList.length, "Failed to create magazine, wrong ammo list!");
	assert(this.ammoDescription, "No ammo descriptions registered for this cannon!");
	assert(!this.magazine || this.magazine.length == 0, "Failed to create magazine, current is not empty!")
	if (!this.magazine)
		this.magazine = [];
	var magazine = {};
	for (var i = 0; i < ammoList.length; i++) {
		assert(this.ammoDescription[ammoList[i]], "Ammo descriptions contains no " + ammoList[i]);
		var ammo = this.ammoDescription[ammoList[i]];
		ammo.canvas = this.parent.getCanvas();
		magazine[this.id + "_" + ammoList[i] + i] = ammo;
	}
	this.initChildren({'children': magazine});	
	for (var i = 0; i < this.children.length; i++) {
		this.magazine.push(this.children[i]);
	}
};

Cannon.prototype.createMagazinePreview = function () {
	if (!this.magazine && this.magazine.length <= 0)
		return;
    var that = this;
    var scene = this.parent;
    var nearWheel = this.getVisual("nearWheel");
    for (var i = 0; i < this.magazine.length; i++) {
        var params = AMMO_DESC[this.magazine[i].type].visuals["main"];
        var before = 3;
        var birdsPlace = (i < before) ? nearWheel.width * 0.75 + i * params.width * 0.8 
        		: -(i - (before-1)) * params.width * 0.8;
        var x = nearWheel.x + birdsPlace;
        var y = nearWheel.y + nearWheel.height - params.height;
        var preview = guiFactory.createObject("GuiSprite", $['extend']({
            'parent': this.guiParent,
            'style': "sprite",
            'x': x,
            'y': y,
            'z': -1,
            'canvas' : this.parent.canvas
        }, params));
        
        preview.destination = new b2Vec2(this.barrelPlace.x - preview.width / 2 ,
    									 this.barrelPlace.y - preview.height / 2);
        preview.dx = preview.destination.x - preview.x;
        preview.dy = preview.destination.y - preview.y;
        preview.normX = preview.dx / Math.sqrt(Math.pow(preview.dx, 2) + Math.pow(preview.dy, 2));
        preview.normY = preview.dy / Math.sqrt(Math.pow(preview.dx, 2) + Math.pow(preview.dy, 2));
        
        this.magazine[i].preview = preview;
    }
};

Cannon.prototype.load = function () {
	if (this.state !== CannonState.empty || this.loaded || this.locked === true)
		return;
	if (this.isEmptyMagazine()) {
		this.parent.onNothingLeftToFire();
		return;
	}
	this.state = CannonState.loading;
};

Cannon.prototype.processLoading = function (dt) {
    var stepX = GAME_BALANCE['Cannon'].LOADING_SPEED * (dt / 1000) * this.magazine[0].preview.normX;
    var stepY = GAME_BALANCE['Cannon'].LOADING_SPEED * (dt / 1000) * this.magazine[0].preview.normY;

    var nextX = this.magazine[0].preview.x + stepX;
    var nextY = this.magazine[0].preview.y + stepY;
           
    this.magazine[0].preview.setZ(10);
    var tempX = (this.magazine[0].preview.destination.x - nextX) * this.magazine[0].preview.normX
        / Math.abs(this.magazine[0].preview.normX);
    var tempY = (this.magazine[0].preview.destination.y - nextY) * this.magazine[0].preview.normY
        / Math.abs(this.magazine[0].preview.normY);
    
    if (tempX > 0 && tempY > 0) {
        this.magazine[0].preview.setPosition(nextX, nextY);
    } else {
    	this.magazine[0].preview.setPosition(this.magazine[0].preview.destination.x,
    										 this.magazine[0].preview.destination.y);
        this.state = CannonState.loaded;
        this.loaded = this.magazine[0];
        this.magazine.splice(0, 1);
        this.setSlingShotVisible(false);
        this.loaded.onLoadComplete({ 
        	'guiParent': this.guiParent, 
        	'barrelPlace': this.barrelPlace 
        });
        if (this.onLoadComplete)
            this.onLoadComplete();
    }
};

Cannon.prototype.update = function (dt) { 
	Cannon.parent.update.call(this, dt);
    if (this.state === CannonState.loading)
    	this.processLoading(dt);
};

Cannon.prototype.alterFire = function () {
	if (!this.children || !this.children.length || this.locked)
		return;
	for (var i = 0; i < this.children.length; i++)
		if (this.children[i].launched) 
			this.children[i].alter();
};

Cannon.prototype.setSlingShotVisible = function (value) {
    var backRubberVisual = this.getVisual("backRubber");
    var frontRubberVisual = this.getVisual("frontRubber");
    var leatherPadVisual = this.getVisual("leatherPad");
    if (value) {
        if (backRubberVisual && !backRubberVisual.visible) backRubberVisual.show();
        if (frontRubberVisual && !frontRubberVisual.visible) frontRubberVisual.show();
        if (leatherPadVisual && !leatherPadVisual.visible) leatherPadVisual.show();
    } else {
        backRubberVisual.hide();
        frontRubberVisual.hide();
        leatherPadVisual.hide();
    }
};

Cannon.prototype.constraintSlingshot = function (offset) {
//	if (!this.oldOffset)
//		this.oldOffset = offset.Copy();
	var constraintedOffset = new b2Vec2(-3.038, 5.561);
	constraintedOffset.Normalize;
	var angle = MathUtils.toDeg(Math.atan2(-offset.y, offset.x));
	var constraints = GAME_BALANCE['Cannon'].NO_NAVIGATION_LOW_POWER;
	if (angle > constraints.FROM && angle < constraints.TO) {
		offset = this.constraintedOffset.Copy();//this.oldOffset.Copy();
	} 
//	this.oldOffset = offset.Copy()
	return offset;
};

Cannon.prototype.updateSlingshot = function (pos, ballLeatherPadOffset, leatherPadAngle) {
    var backRubberVisual = this.getVisual("backRubber");
    var frontRubberVisual = this.getVisual("frontRubber");
    var leatherPadVisual = this.getVisual("leatherPad");
    
    var leatherPadPos = new b2Vec2(0,0);
    leatherPadPos.x = pos.x + ballLeatherPadOffset.x;
    leatherPadPos.y = pos.y + ballLeatherPadOffset.y;

    var leatherPadPosCopy = new b2Vec2(leatherPadPos.x, leatherPadPos.y);

    // rubber Update
    // backRubber
    var dir = b2Math.SubtractVV(leatherPadPos, this.backRubberConnectionPosition);
    var backRubberAngle = Math.atan2(dir.y, dir.x);
    var backRubberPos = MathUtils.lerp(leatherPadPos, this.backRubberConnectionPosition, 0.5);
    backRubberPos.x *= Screen.widthRatio();
    backRubberPos.y *= Screen.heightRatio();
    var scaleX = dir.Length() / backRubberVisual.width;
    var transform = {angle: MathUtils.toDeg(backRubberAngle), scaleX: scaleX, translate: backRubberPos};
    backRubberVisual.setTransform2(transform);

    // frontRubber
    dir = b2Math.SubtractVV(leatherPadPos, this.frontRubberConnectionPosition);
    var angle = Math.atan2(dir.y, dir.x);
    var frontRubberPos = MathUtils.lerp(leatherPadPos, this.frontRubberConnectionPosition, 0.5);
    frontRubberPos.x *= Screen.widthRatio();
    frontRubberPos.y *= Screen.heightRatio();
    scaleX = dir.Length() / frontRubberVisual.width;
    transform = {angle: MathUtils.toDeg(angle), scaleX: scaleX, translate: frontRubberPos};
    frontRubberVisual.setTransform2(transform);

    // leatherPad
    dir = b2Math.SubtractVV(leatherPadPos, this.barrelPlace);
    angle = leatherPadAngle? leatherPadAngle : Math.atan2(dir.y + 10, dir.x + 10);
    leatherPadPos.x *= Screen.widthRatio();
    leatherPadPos.y *= Screen.heightRatio();
    transform = {angle: MathUtils.toDeg(angle - (leatherPadAngle && this.direction.x < 0 ? -Math.PI/6 : Math.PI)), translate: leatherPadPos};
    leatherPadVisual.setTransform2(transform);
};

Cannon.prototype.createPointCloudsPool = function (size) {
	assert(size, "Wrong point clouds pool size param");
	var that = this;
	var cloudsPool = [];
	for (var i = 0; i < size; i++) {
		var gui = guiFactory.createObject(
			"GuiSprite", {
				'parent' : that.guiParent,
				"canvas" : that.parent.getCanvas(),
				"style" : "sprite",
				"width" : (i % 2 == 0) ? 14 : 10,
				"height" : (i % 2 == 0) ? 14 : 10,
				"totalImage" : (i % 2 == 0) ? "FinalArt/CannonBalls/PointCloud002.png"
						: "FinalArt/CannonBalls/PointCloud001.png",
				"totalImageWidth" : (i % 2 == 0) ? 14 : 10,
				"totalImageHeight" : (i % 2 == 0) ? 14 : 10,
				"totalTile" : 1,
				"x" : 0,
				"y" : 0,
				"z" : 5,
				"hide" : true
			});
		gui.setZ(5);
		gui.hide();
		gui.clampByParentViewport(false);
		cloudsPool.push(gui);
	}
	return cloudsPool;
};

Cannon.prototype.resetPointCloudsPool = function () {
	for (var i = 0; i < this.pointCloudsUsed; i++)
		this.pointCloudsPool[i].hide();
	this.pointCloudsUsed = 0;
};

Cannon.prototype.showPointCloud = function (pos) {
	if (this.state !== CannonState.fired || this.pointCloudsUsed >= this.pointCloudsPool.length)
		return;
	this.pointCloudsPool[this.pointCloudsUsed].setPosition(pos.x, pos.y);
	this.pointCloudsPool[this.pointCloudsUsed++].show();
};



Cannon.prototype.bind = function (event, callback) {
    $['each'](this.visuals, function (id, visualInfo) {
        if (visualInfo.visual)
            visualInfo.visual.jObject['bind'](event, callback);
    });
};

Cannon.prototype.lock = function () {
	this.locked = true;
	if (this.state == CannonState.navigating)
		this.cancelNavigation();
};

Cannon.prototype.unlock = function () {
	this.locked = false;
	if (this.state == CannonState.waitsToLoad)
		this.load();
};

Cannon.prototype.getLocked = function () {
	return this.locked;
};

Cannon.prototype.getLoaded = function () {
	return this.loaded;
};

Cannon.prototype.isEmptyMagazine = function () {
	return !this.magazine || this.magazine.length <= 0;
};

Cannon.prototype.getMagazine = function () {
	return this.magazine;
};

Cannon.prototype.setAmmoDescription = function (description) {
	this.ammoDescription = description;
};

Cannon.prototype.getState = function () {
	return this.state * 1;
};

Cannon.prototype.setState = function (state) {
	if (this.locked)
		if (state == CannonState.empty)
			this.state = CannonState.waitsToLoad;
		else
			return;
	this.state = state;
};

Cannon.prototype.getPointCloudPool = function () {
	return this.pointCloudPool;
};

Cannon.prototype.resize = function () {
	if (!this.magazine || !this.magazine.length)
		return;
	for (var i = 0; i < this.magazine.length; i++)
		this.magazine[i].preview.resize();
};
/**
 * CasualBird represents CasualBird entity with it`s pointcloud path
 */

CasualBird.prototype = new PhysicEntity();
CasualBird.prototype.constructor = CasualBird;

/**
 * @constructor
 */
function CasualBird() {
	CasualBird.parent.constructor.call(this);
};

CasualBird.inheritsFrom(PhysicEntity);
CasualBird.prototype.className = "CasualBird";

CasualBird.prototype.createInstance = function(params) {
	var entity = new CasualBird();
	entity.init(params);
	return entity;
};

entityFactory.addClass(CasualBird);

CasualBird.prototype.init = function (params) {
    CasualBird.parent.init.call(this, params);
    this.explosion = null;
    this.startPosition = new b2Vec2(0, 0);
    this.launched = false;
    this.showClouds = false;
    this.suicided = false;
    this.altered = false;
    this.landed = false;
    this.grounded = false;
    this.path = params['path'];
    this.type = params['type'];
    this.visual = null;
    this.material = "cannonBall";
    this.sounds = params['sounds'];
    
    this.explodeFlag = false;
    
    this.newPathPoint = new b2Vec2(0, 0);
    this.lastPathPoint = new b2Vec2(0, 0);
}

CasualBird.prototype.createPhysics = function () {
    CasualBird.parent.createPhysics.call(this);
    this.setContactBeginCallback(this.onHit);
    this.physics.SetActive(false);
    this.physics.SetAwake(false);
}

CasualBird.prototype.createVisual = function() {
	var that = this;
	var description = this.params;

	$['each'](description.visuals, function(id, visualInfo) {
		var gui = guiFactory.createObject(visualInfo['class'], $.extend({
			'parent' : that.guiParent,
			"canvas" : that.params.canvas,
			'style' : "sprite",
			'x' : that.params.x - description.visuals.main.width / 2,
			'y' : that.params.y - description.visuals.main.height / 2
		}, visualInfo));
//		gui.setZ(gui.params.z);
		gui.setTransformOrigin({ 
			'x' : description.visuals.main.transformX/100, 
			'y' : description.visuals.main.transformY/100 });
		var resInfo = {};
		resInfo.visual = gui;
		that.addVisual(id, resInfo);
	});
	
    this.newPathPoint.Set(this.x, this.y);
    this.lastPathPoint.Set(this.x, this.y);
    
    if (!this.explosion)
    	this.explosion = this.parent.parent.getChild(this.type + "Explosion");
    
    this.visual = this.getVisual('main');
};

CasualBird.prototype.launch = function(direction, power, torque) {
	var that = this;
	this.physics.SetActive(true);
	this.physics.SetAwake(true);
	if (torque)
		this.physics.ApplyTorque(torque);
	if (direction && power) {
		var impulse = new b2Vec2(direction.x, direction.y);
		impulse.Normalize();
		impulse.Multiply(power);
		this.physics.ApplyImpulse(impulse, this.physics.GetWorldCenter());
	}
	if (this.visual && this.visual.animations["attack"])
		this.visual.playAnimation("attack", 50, false, true);
	this.playSound('launch');
	this.startPosition.Set(this.x, this.y);
	this.launched = true;
};

CasualBird.prototype.alter = function(params) {
	if (!this.landed && !this.altered) {
		this.altered = true;
		this.playSound("alter");
		return false;
	}
	if (this.landed && !this.suicided) {
		this.suicided = true;
		this.explode(params);
		return true;
	}
	return this.altered;
};

CasualBird.prototype.explode = function(params, dontDestroy) {
	if (params)
		Physics.explode(params);
	if(this.explosion)	
		this.explosion.play({
			"x" : this.x + this.visual.width/2,
			"y" : this.y + this.visual.height/2
		});
	this.playSound('explode');
	if (!dontDestroy)
		Account.instance.removeEntity(this.id);
};

CasualBird.prototype.destroy = function() {
	if (this.parent.type === "cannon") {
		this.parent.setState(CannonState.empty);
		this.parent.load();
	};
	CasualBird.parent.destroy.call(this);
};

CasualBird.prototype.onLoadComplete = function(args) {
    this.attachToGui(args.guiParent, false);
    this.setPhysicsPosition(args.barrelPlace);
    if (this.preview)
    	this.preview.remove();
    this.preview = null;
    this.getVisual("main").playAnimation("loaded", 50, false, true);
};

CasualBird.prototype.update = function() {
	if (!this.physics || this.physics.IsActive() === false)
		return;
	if (this.physics.IsAwake() === true && this.landed === false) {
			this.newPathPoint.Set(this.x + this.getVisual("main").width/2, this.y + this.getVisual("main").height/2);
			if (this.showClouds && distance(this.lastPathPoint, this.newPathPoint) >= GAME_BALANCE['Ammo'].POINT_CLOUD_STEP) {
				this.showPointCloud(this.newPathPoint);
				this.lastPathPoint = this.newPathPoint.Copy();
			}  else if (this.showClouds === false) 
				this.showClouds = distance(this.newPathPoint, this.startPosition) >= GAME_BALANCE['Ammo'].POINT_CLOUD_START_OFFSET;
	} else 
		if (this.explodeFlag && Math.abs(this.physics.m_angularVelocity) <= GAME_BALANCE['Ammo'].ROTATION_THRESHHOLD)
			this.explode();
};

CasualBird.prototype.showPointCloud = function(pos) {
		this.parent.showPointCloud(pos);
};

CasualBird.prototype.onHit = function(contact, other) {
	var that = this;
	if (!other || !other.physics || other.material === "constraint" || other.material === "cannonBall")	
		return;
	
	if (this.landed === false) { 
		this.grounded = true;
		if(this.visual && this.visual.animations["hurt"])
			this.visual.playAnimation("hurt", 50, false, true);
		this.landed = true;
	}
	
	this.setTimeout(function(){
		that.explodeFlag = true;
	}, 2000);
	
	if (other.material === "ground") {
		this.playSound("groundHit");
	} else
	if (/*other.destructable && */other.type !== 'enemy')
		other.playSound('hit');

	
	var power = GAME_BALANCE['Ammo']['Birds'][this.type].hitRatio;

	var impulse1 = this.physics.GetMass() * Math.pow(this.physics.GetLinearVelocity().Length(), 2);
	var impulse2 = other.physics.GetMass() * Math.pow(other.physics.GetLinearVelocity().Length(), 2);

	var damage = (impulse1 + impulse2) * power * GAME_BALANCE['Ammo'].BIRD_DESTRUCTION_RATIO;
	if (other.destructable)
		other.onDamage(damage);
};

CasualBird.prototype.isLaunched = function() {
	return this.launched;
};

CasualBird.prototype.isAltered = function() {
	return this.altered;
};AcceleratorBird.prototype = new CasualBird();
AcceleratorBird.prototype.constructor = AcceleratorBird;

/**
 * @constructor
 */
function AcceleratorBird() {
	AcceleratorBird.parent.constructor.call(this);
};

AcceleratorBird.inheritsFrom(CasualBird);
AcceleratorBird.prototype.className = "AcceleratorBird";

AcceleratorBird.prototype.createInstance = function(params) {
	var entity = new AcceleratorBird();
	entity.init(params);
	return entity;
};

entityFactory.addClass(AcceleratorBird);

AcceleratorBird.prototype.alter = function(params) {
	if (AcceleratorBird.parent.alter.call(this, params))
		return;
	var velo = this.physics.GetLinearVelocity();
	if (velo.x === 0 && velo.y === 0)
		return;
	var impulse = new b2Vec2(velo.x, velo.y);
	impulse.Normalize();
	impulse.Multiply(GAME_BALANCE['Cannon'].POWER_RATING * 0.5);
	var centerPos = this.physics.GetWorldCenter();
	this.physics.ApplyImpulse(impulse, new b2Vec2(centerPos.x,
			centerPos.y));
	this.getVisual("main").playAnimation("goGo", 50, false, true);
	this.accelerated = true;
};ExplosiveBird.prototype = new CasualBird();
ExplosiveBird.prototype.constructor = ExplosiveBird;

/**
 * @constructor
 */
function ExplosiveBird() {
	ExplosiveBird.parent.constructor.call(this);
};

ExplosiveBird.inheritsFrom(CasualBird);
ExplosiveBird.prototype.className = "ExplosiveBird";

ExplosiveBird.prototype.createInstance = function(params) {
	var entity = new ExplosiveBird();
	entity.init(params);
	return entity;
};

entityFactory.addClass(ExplosiveBird);

ExplosiveBird.prototype.alter = function(params) {
	pos = this.getPosition();
	if(ExplosiveBird.parent.alter.call(this, params))
		return;
	this.explode();
};

ExplosiveBird.prototype.explode = function() {
	var params = this.getExplosionParams();
	ExplosiveBird.parent.explode.call(this, params);
};

ExplosiveBird.prototype.getExplosionParams = function() {
	pos = this.getPosition();
	var params = {
		center : pos,
        radius : GAME_BALANCE['Ammo']['Birds'][this.type].bang.radius,
        force : GAME_BALANCE['Ammo']['Birds'][this.type].bang.force,
        duration : GAME_BALANCE['Ammo']['Birds'][this.type].bang.duration,
        damageDecr : GAME_BALANCE['Ammo']['Birds'][this.type].bang.damageDecr,
		owner : this
	};
	return params;
};
Egg.prototype = new CasualBird();
Egg.prototype.constructor = Egg;

/**
 * @constructor
 */
function Egg() {
	Egg.parent.constructor.call(this);
};

Egg.inheritsFrom(CasualBird);
Egg.prototype.className = "Egg";

Egg.prototype.createInstance = function(params) {
	var entity = new Egg();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Egg);

Egg.prototype.alter = function(params) {};

Egg.prototype.createPhysics = function() {
	Egg.parent.createPhysics.call(this);
	this.physics.SetFixedRotation(true);
};

Egg.prototype.createVisual = function() {
	this.explosion = this.parent.parent.parent.getChild("bombExplosion");	// Its damn huckish
	Egg.parent.createVisual.call(this);
	this.explodeFlag = true;
	this.showClouds = true;
};

Egg.prototype.explode = function(params, dontDestroy) {
	var pos = this.getPosition();
	params = {
			center : pos,
	        radius : GAME_BALANCE['Ammo']['Birds'][this.type].bang.radius,
	        force : GAME_BALANCE['Ammo']['Birds'][this.type].bang.force,
	        duration : GAME_BALANCE['Ammo']['Birds'][this.type].bang.duration,
	        damageDecr : GAME_BALANCE['Ammo']['Birds'][this.type].bang.damageDecr,
			owner : this
	};
	Egg.parent.explode.call(this, params, dontDestroy);
	if (this.parent.children.length == 0)
		if (!this.parent.physics)
			Account.instance.removeEntity(this.parent.id);
};BomberBird.prototype = new CasualBird();
BomberBird.prototype.constructor = BomberBird;

/**
 * @constructor
 */
function BomberBird() {
	BomberBird.parent.constructor.call(this);
};

BomberBird.inheritsFrom(CasualBird);
BomberBird.prototype.className = "BomberBird";

BomberBird.prototype.createInstance = function(params) {
	var entity = new BomberBird();
	entity.init(params);
	return entity;
};

entityFactory.addClass(BomberBird);

BomberBird.prototype.createVisual = function() {
	BomberBird.parent.createVisual.call(this);
//    this.explosion = this.parent.parent.getChild("BallExplosion");
};

BomberBird.prototype.alter = function(params) {
	if(BomberBird.parent.alter.call(this, params))
		return;
	this.createEggs();
	this.shootEggs();
	this.flyAway();
};

BomberBird.prototype.flyAway = function() {
	var bla = MathUtils.toRad(GAME_BALANCE['Ammo']['Birds'][this.type].flyAwayAngle);
	bla = Math.sin(bla);
	var impulse = new b2Vec2(Math.sqrt(1 - Math.pow(bla, 2)), bla);
	impulse.Normalize();
	impulse.Multiply(GAME_BALANCE['Cannon'].POWER_RATING);
	var pos = this.physics.GetWorldCenter();
	this.physics.ApplyImpulse(impulse, pos);
	this.explode(null, true);
};

BomberBird.prototype.createEggs = function() {
	var children = {};
	for ( var i = 0; i < GAME_BALANCE['Ammo']['Birds'][this.type].eggCount; i++) { 
		var child = cloneObject(AMMO_DESC["egg"]);
		child.canvas = this.parent.parent.getCanvas();
		child.explosion = this.parent.parent.getChild("bombExplosion");
		children[this.id + "_Egg" + i] = child;
	};
	this.initChildren({'children' : children});
	
	for (var i = 0; i < this.children.length; i++) {
		this.children[i].attachToGui(this.guiParent, false);	
		this.children[i].getVisual("main").setZ(9998);
	};
};

BomberBird.prototype.shootEggs = function() {
	var angleStep = GAME_BALANCE['Ammo']['Birds'][this.type].shootRange / this.children.length;
	var angle = -angleStep * this.children.length / 2;
	for (var i = 0; i < this.children.length; i++) {
		var direction = new b2Vec2(Math.sin(angle), Math.cos(angle));
		var pos = this.getPosition();
		pos.x = pos.x + direction.x * 25;
		pos.y = pos.y + direction.y * 25;
		this.children[i].setPhysicsPosition(pos);
		this.children[i].launch(direction, GAME_BALANCE['Ammo']['Birds'][this.type].eggSpeed);
		this.children[i].getVisual("main").show();
		angle += angleStep;
	}
};
BoomerangBird.prototype = new CasualBird();
BoomerangBird.prototype.constructor = BoomerangBird;

/**
 * @constructor
 */
function BoomerangBird() {
	BoomerangBird.parent.constructor.call(this);
};

BoomerangBird.inheritsFrom(CasualBird);
BoomerangBird.prototype.className = "BoomerangBird";

BoomerangBird.prototype.createInstance = function(params) {
	var entity = new BoomerangBird();
	entity.init(params);
	return entity;
};

entityFactory.addClass(BoomerangBird);

BoomerangBird.prototype.init = function(params) {
	BoomerangBird.parent.init.call(this, params);
	this.dVx = 0;
	this.targetVx = 0;
	this.velocity = new b2Vec2(0, 0);
};

BoomerangBird.prototype.createVisual = function() {
	BoomerangBird.parent.createVisual.call(this);
//    this.explosion = this.parent.parent.getChild("BallExplosion");
};

BoomerangBird.prototype.alter = function(params) {
	if (BoomerangBird.parent.alter.call(this, params))
		return;
	var velocity = this.physics.GetLinearVelocity();
	this.targetVx = -velocity.x;
	this.dVx = velocity.x * GAME_BALANCE['Ammo']['Birds'][this.type].dVxRating;
	this.explosion.play({
		"x" : this.x,
		"y" : this.y
	});
};

BoomerangBird.prototype.update = function(dt) {
	BoomerangBird.parent.update.call(this, dt);
	if (!this.physics)
		return;
	if (this.altered === true && this.landed !== true) {
		this.velocity = this.physics.GetLinearVelocity();
		this.velocity.x -= (this.targetVx <= this.velocity.x ? this.dVx * dt : 0);
		this.physics.SetLinearVelocity(this.velocity);
	}
};LittleBird.prototype = new CasualBird();
LittleBird.prototype.constructor = LittleBird;

/**
 * @constructor
 */
function LittleBird() {
	LittleBird.parent.constructor.call(this);
};

LittleBird.inheritsFrom(CasualBird);
LittleBird.prototype.className = "LittleBird";

LittleBird.prototype.createInstance = function(params) {
	var entity = new LittleBird();
	entity.init(params);
	return entity;
};

entityFactory.addClass(LittleBird);

//LittleBird.prototype.alter = function(params) {};

//LittleBird.prototype.createPhysics = function() {
//	LittleBird.parent.createPhysics.call(this);
//	this.physics.SetFixedRotation(true);
//};

LittleBird.prototype.createVisual = function() {
	this.explosion = this.parent.parent.parent.getChild("birdsExplosion");	// Its damn huckish
	LittleBird.parent.createVisual.call(this);
//	this.explodeFlag = true;
//	this.showClouds = true;
};

//LittleBird.prototype.explode = function(params, dontDestroy) {
//	LittleBird.parent.explode.call(this, params, dontDestroy);
//	if (this.parent.children.length == 0)
//		if (!this.parent.physics)
//			Account.instance.removeEntity(this.parent.id);
//};

LittleBird.prototype.destroy = function() {
	LittleBird.parent.destroy.call(this);
	if (this.parent.children.length == 0)
			Account.instance.removeEntity(this.parent.id);
};PackBird.prototype = new CasualBird();
PackBird.prototype.constructor = PackBird;

/**
 * @constructor
 */
function PackBird() {
	PackBird.parent.constructor.call(this);
};

PackBird.inheritsFrom(CasualBird);
PackBird.prototype.className = "PackBird";

PackBird.prototype.createInstance = function(params) {
	var entity = new PackBird();
	entity.init(params);
	return entity;
};

entityFactory.addClass(PackBird);

PackBird.prototype.createVisual = function() {
	PackBird.parent.createVisual.call(this);
//    this.explosion = this.parent.parent.getChild("BallExplosion");
};

PackBird.prototype.alter = function(params) {
//	if(PackBird.parent.alter.call(this, params))
//		return;
	for (var i = 0; i < this.children.length; i++)
		if (this.children[i].launched)
			this.children[i].alter(params);
};

PackBird.prototype.launch = function(direction, power, torque) {
	PackBird.parent.launch.call(this, direction, power, torque);
	this.createBirds();
	this.shootBirds(direction, power, torque);
};

PackBird.prototype.createBirds = function() {
	var children = {};
	for ( var i = 0; i < GAME_BALANCE['Ammo']['Birds'][this.type].birdsCount; i++) { 
		var child = cloneObject(AMMO_DESC["birds"]);
		child.canvas = this.parent.parent.getCanvas();
		child.hide = true;
		children[this.id + "_Bird" + i] = child;
		
	};
	this.initChildren({'children' : children});
	
	for (var i = 0; i < this.children.length; i++) {
		this.children[i].attachToGui(this.guiParent, false);	
		this.children[i].getVisual("main").setZ(9998);
	};
};

PackBird.prototype.shootBirds = function(direction, power, torque) {
	direction.Normalize();
	var mainPos = this.getPosition();
	this.destroyPhysics();
	this.hide();
	for (var i = 0; i < this.children.length; i++) {
		var pos = new b2Vec2(mainPos.x + direction.x * (i + 1) * this.visual.width * GAME_BALANCE['Ammo']['Birds'][this.type].birdOffsetRatio.x,
				mainPos.y + direction.y *( (i + 1) * (this.visual.height)) * GAME_BALANCE['Ammo']['Birds'][this.type].birdOffsetRatio.y);
		var birdPower = GAME_BALANCE['Ammo']['Birds'][this.type].birdLaunchPowerRatio * 
						GAME_BALANCE['Cannon'].POWER_RATING * 0.85 * (power - (i * 0.1 - 0.05)) ;
		this.children[i].setPhysicsPosition(pos);
		this.children[i].launch(direction, power);
		this.children[i].visual.show();
	}
};
