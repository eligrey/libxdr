(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

require('./pmxdr-client');
require('./libxdr');

module.exports = window.XDR;

window.XDR.polyfill = function () {
    window.XDR._XMLHttpRequest = window.XMLHttpRequest;
    window.XMLHttpRequest = window.XDR;
};

typeof ftXDRLoaded==='function' && ftXDRLoaded();
},{"./libxdr":2,"./pmxdr-client":3}],2:[function(require,module,exports){
/* libxdr: Cross-browser cross-domain request library
@version 0.0.1
@requires pmxdr client library, http://code.eligrey.com/pmxdr/client/
@archive http://code.eligrey.com/pmxdr/libxdr/
@desc Implements XDR cross-domain request constructor using the pmxdr client library
@license X11/MIT
@author Eli Grey, http://eligrey.com
*/

/*! @source http://purl.eligrey.com/github/libxdr/blob/master/libxdr.js*/

if (!window.XDR) {
  var XHR = window.XMLHttpRequest;
  window.XDR = function () {};

  //XDR.defaultTimeout = 10000; // default timeout; 10000 is IE8's default for similar XDomainRequest

  function needsCors (uri) {
    var origin = location.protocol + '//' + location.host;
    (/^\/\//.test(uri) ? location.protocol + uri : uri).substring(0, origin.length) !== origin;
  }

  XDR.prototype = {

    open: function (method, uri, async) {

      if (async === false)
        throw new RangeError("XDR.open: libxdr does not support synchronous requests.");

      this._cors = needsCors(uri);
      if (!this._cors) {
        XHR.prototype.open.apply(this, arguments);
      } else {
        this._request = { // request object for pmxdr.request
          method : method,
          uri    : uri,
          headers: {}
        }
      }
    },

    setRequestHeader: function(header, value) {
      if (!this._cors) {
        XHR.prototype.setRequestHeader.apply(this, arguments);
      } else {
        this._request.headers[header.toLowerCase()] = value;
      }
    },

    removeRequestHeader: function(header) {
      if (!this._cors) {
        XHR.prototype.removeRequestHeader.apply(this, arguments);
      } else {
        delete this._request.headers[header.toLowerCase()];
      }
    },

    send: function (data) {
      if (!this._cors) {
        return XHR.prototype.send.apply(this, arguments);
      } else {
        var instance = this; // for minification & reference to this
        instance._request.data = data;
        instance._request.callback = function(response) {
          instance.readyState = 4; // for onreadystatechange

          if (response.error) {
            if (response.error == "LOAD_ERROR") {
              instance.status = 502; // 502 Bad Gateway (seems reasonable when response.status is not set)
              instance.statusText = "Bad Gateway";
            }

            else if (response.error == "DISALLOWED_REQUEST_METHOD") {
              instance.status = 405; // 405 Method Not Allowed
              instance.statusText = "Method Not Allowed";
            }

            else if (response.error == "TIMEOUT") {
              instance.status = 408; // 408 Request Timeout
              instance.statusText = "Request Timeout";
            }

            else if (response.error == "DISALLOWED_ORIGIN") {
              instance.status = 412; // 412 Precondition Failed (seems right for disallowed origin)
              instance.statusText = "Precondition Failed";
            }
          } else {
            if (response.status)
              instance.status = response.status;
            if (response.statusText)
              instance.statusText = response.statusText;
          }

            if (!instance.status)
              instance.status = 200; // pmxdr host wouldn't respond unless the status was 200 so default to it


          if (response.error || instance.status >= 400) {
            if (typeof instance.onloadend == "function")
              instance.onloadend();
            if (typeof instance.onerror == "function")
              return instance.onerror();
          }

          if (instance.status == 408 && typeof instance.ontimeout == "function")
              return instance.ontimeout();

          if (!response.headers) {
            response.headers = {};
          }

          instance.contentType = response.headers["content-type"];

          var headers = [];
          for (var header in response.headers) // recreate the getAllResponseHeaders string
            if (response.headers.hasOwnProperty(header))
              headers.push(header + ": " + response.headers[header]);

          headers = headers.join("\r\n");
          instance.getAllResponseHeaders = function() {
            return headers;
          }

          instance.getResponseHeader = function(header) {
            return response.headers[header.toLowerCase()] || null;
          }

          var xml;
          if (/\/xml$/i.test(instance.contentType) || response.data.substr(0, 5) == '<?xml') {
            try {
                if (window.DOMParser) { // Standard
                    xml = (new DOMParser()).parseFromString(response.data, "text/xml");
                } else { // IE
                    xml = new ActiveXObject("Microsoft.XMLDOM");
                    xml.async = "false";
                    xml.loadXML(data);
                }
            } catch (e) {
                xml = undefined;
            }

            if (!xml || !xml.documentElement || xml.getElementsByTagName("parsererror").length) {
                xml = undefined;
            }
          }

          instance.responseXML = xml;

          instance.responseText = response.data;

          if (typeof instance.onreadystatechange == "function")
            instance.onreadystatechange();
          if (typeof instance.onprogress == "function")
            instance.onprogress();
          if (typeof instance.onload == "function")
            instance.onload();
          if (typeof instance.onloadend == "function")
            instance.onloadend();

        };

        if (instance.timeout) instance._request.timeout = instance.timeout;
        else if (XDR.defaultTimeout) instance._request.timeout = XDR.defaultTimeout;

        // do the request and get the abort method
        var aborter = pmxdr.request(instance._request).abort;

        instance.abort = function() {
          aborter();
        };
      }
    },

    abort: function() { // default abort
      if (!this._cors) {
        return XHR.prototype.abort.apply(this, arguments);
      } else {
        delete this._request;
      }
    }
  }
}

},{}],3:[function(require,module,exports){
/* pmxdr: postMessage Cross-Domain Requester
@version 0.0.6
@archive http://code.eligrey.com/pmxdr/client/
@desc Cross-domain HTTP requesting using the postMessage API
@license X11/MIT
@author Eli Grey, http://eligrey.com
*/

/*! @source http://purl.eligrey.com/github/pmxdr/blob/master/pmxdr-client.js*/

(function(window) {

	if (typeof window.opera != "undefined" && parseInt(window.opera.version()) == 9) // Opera 9.x MessageEvent.origin fix (only for http:, not https:)
			Event.prototype.__defineGetter__("origin", function(){
				return "http://" + this.domain;
			});

	function pmxdr(host, onload) {
		var instance = this; // for YUI compressor
		instance.iFrame	= document.createElement("iframe"); // interface frame
		instance.iFrame.style.display = "none";
		instance.origin = host.replace(pmxdr.originRegex, "$1");

		function onloadHandler() {
			if (typeof instance.onload == "function")
				instance.onload();
		}

		if (instance.iFrame.addEventListener)
			instance.iFrame.addEventListener("load", onloadHandler, false);
		else if (instance.iFrame.attachEvent)
			instance.iFrame.attachEvent("onload", onloadHandler);

		instance.iFrame.src = instance.origin + pmxdr.getEndpoint(host);
		if (typeof onload == "function") {
			instance.onload = onload;
			instance.init();
		}
	}

	pmxdr.endpoints = [];
	pmxdr.originRegex = /^([\w-]+:\/*\[?[\w\.:-]+\]?(?::\d+)?).*/; // RegExp.$1 = protocol+host+port (the square brackets are for ipv6)
	pmxdr.request = function(req) {
		if (typeof req == "string")
			return pmxdr.request({uri: req});
		else if (Object.prototype.toString.call(req) == "[object Array]") { // handle array of requests
			var requests = [];
			for (var i=0; i<req.length; i++)
				requests.push(pmxdr.request(req[i]));
			return requests;
		}

		var pmxdrInstance = new pmxdr(req.uri),
		callback = req.callback;
		req.id = pmxdr.getSafeID();

		req.callback = function(response) {
			if (typeof callback == "function") callback.call(this, response);
			this.unload();
		}

		pmxdrInstance.onload = function() {
			this.request(req);
		}

		pmxdrInstance.init()
		return {
			abort: function() {
				pmxdr.requests.aborted[req.id] = true;
			}
		}
	}
	// parent for interface frames
	pmxdr.interfaceFrameParent = document.documentElement||document.getElementsByTagName("head")[0]||document.body||document.getElementsByTagName("body")[0];

	pmxdr.getSafeID = function() { // generate a random key that doesn't collide with any existing keys
				var randID = Math.random().toString().substr(2); // Generate a random number, make it a string, and cut off the "0." to make it look nice
				if (typeof pmxdr.requests[randID] == "undefined") return randID; // key doesn't collide
				else return pmxdr.getSafeID();
	}

	pmxdr.getEndpoint = function(uri) {
		var x,
		endpoint,
		endpoints = pmxdr.endpoints,
		length = endpoints.length;

		for (x = 0; x < length; x++) {
			endpoint = endpoints[x];

			if (typeof endpoint.origin === "string") {
				if (!uri.indexOf(endpoint.origin)) {
					break;
				}
			} else if (endpoint.origin.test(uri)) {
				break;
			}
		}

		return endpoint ? endpoint.endpoint : "/pmxdr/api";
	}

	pmxdr.prototype = {

		init: function(onload) { // load or reload iframe
			if (typeof onload == "function")
				this.onload = onload;
			if (this.iFrame.parentNode) this.unload(); // in case init is being called to re-init
			pmxdr.interfaceFrameParent.appendChild(this.iFrame);
		},

		unload: function() { // remove iframe
			pmxdr.interfaceFrameParent.removeChild(this.iFrame);
		},

		defaultRequestMethod: "GET", // default request method
		//defaultContentType: "application/x-www-form-urlencoded", default content-type header (ie. POST requests, ect.)
		//defaultTimeout: 60000, // optional default timeout at which the request recives a TIMEOUT error (60000 ms = 1 minute)

		request: function(req) { // send a request to a pmxdr host
			var requests = [], instance = this;

			if (Object.prototype.toString.call(req) == "[object Array]") { // handle array of requests
				for (var i=0; i<req.length; i++)
					requests.push(instance.request(req[i]));
				return requests;
			}
			var
			id          = (pmxdr.requests[req.id] ? false : req.id) || pmxdr.getSafeID(),
			method      = req.method      || instance.defaultRequestMethod,
			timeout     = req.timeout     || instance.defaultTimeout,
			contentType = req.contentType || instance.defaultContentType;

			method = method.toUpperCase();

			pmxdr.requests[id] = {
				origin: instance.origin,
				remove: function() {
					delete pmxdr.requests[id];
				},
				callback: function(response) {
					if (typeof req.callback == "function") req.callback.call(instance, response);
					pmxdr.requests[id].remove();
				}
			};

			function timeoutCallback() { // give callback a TIMEOUT error
				if (pmxdr.requests[id] && pmxdr.requests[id].callback)
					pmxdr.requests[id].callback({
						pmxdr	: true,
						id		 : id,
						error	: "TIMEOUT"
					})
			};

			if (contentType) {
				if (!req.headers)
					req.headers = {};
				req.headers["Content-Type"] = contentType.toString();
			}

			instance.iFrame.contentWindow.postMessage(JSON.stringify({
				pmxdr   : true,
				method  : method,
				uri     : req.uri,
				data    : req.data,
				headers : req.headers,
				id      : id
			}), instance.origin);
			if (timeout) setTimeout(timeoutCallback, timeout)

			return {
				abort: pmxdr.requests[id].remove
			};
		}
	}

	pmxdr.requests = { // requests cache
		aborted : {},
		clear   : function() {
			pmxdr.requests = {
				aborted : {},
				clear   : this.clear
			};
		}
	};

	function pmxdrResponseHandler(evt) {
		try {
			var data = JSON.parse(evt.data);
		} catch (e) {
			return;
		}
		if (data.pmxdr == true) { // only handle pmxdr requests
			if (
				pmxdr.requests[data.id]
				&& pmxdr.requests[data.id].origin == evt.origin
				&& typeof pmxdr.requests[data.id].callback == "function"
				&& !pmxdr.requests.aborted[data.id]
			) pmxdr.requests[data.id].callback(data);
			else if (pmxdr.requests.aborted[data.id]) {
				delete pmxdr.requests.aborted[data.id];
				if (data.id in pmxdr.requests)
					delete pmxdr.requests[data.id];
			}
		}
	}

	if (window.addEventListener) window.addEventListener("message", pmxdrResponseHandler, false);
	else if (window.attachEvent) window.attachEvent("onmessage", pmxdrResponseHandler);

	pmxdr.destruct = function() {
		if (window.removeEventListener)
			window.removeEventListener("message", pmxdrResponseHandler, false);
		else if (window.detachEvent)
			window.detachEvent("onmessage", pmxdrResponseHandler);

		delete window.pmxdr;
		delete pmxdrResponseHandler;
	}

	window.pmxdr = pmxdr;
})(window);
},{}]},{},[1]);
