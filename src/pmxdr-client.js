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