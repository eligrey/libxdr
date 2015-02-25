/**
 * pmxdr host v0.0.6
 * postMessage Cross-Domain Requester host library
 * http://code.eligrey.com/pmxdr/host/
 *
 * By Eli Grey, http://eligrey.com
 *
 * Simple cross-site HTTP requesting using the postMessage API
 *
 * License: X11/MIT Licence
 */

/*! @source http://purl.eligrey.com/github/pmxdr/blob/master/pmxdr-host.js*/

/* example alwaysTrustedOrigins settings:

var alwaysTrustedOrigins = [
    // any origin on any protocol that has a domain that ends in eligrey.com
    /^[\w-]+:(?:\/\/)?(?:[\w\.-]+\.)?eligrey\.com(?::\d+)?$/,

    // only http://www.google.com is allowed,
	// not http://foo.google.com:30 or http://google.com
    "http://www.google.com",

    // Allow http and https from example.com and *.example.com
    /^https?:\/\/([\w\.-]+\.)?example\.com$/
];

*/

/*global Event, window, XMLHttpRequest*/
(function (undef) {
	'use strict';

	var alwaysTrustedOrigins = [
		/^https?:\/\/[\w\-]+\.ft\.com$/i
	];


	/**
	 * Clean a header response
	 *
	 * Trim and remove ALL whitespace.  This is because either we want
	 * one value or we want a list separated by commas and optional
	 * whitespace.
	 *
	 * @param string dirty
	 * @return string clean
	 */
	function cleanHeader(dirty) {
		if (typeof dirty !== "string") {
			return "";
		}
		var clean;
		clean = dirty.replace(/[ \n\r\t]/g, '').toUpperCase();
		return clean;
	}


	/**
	 * Return an object of all headers
	 *
	 * @param XMLHttpRequest request
	 * @return Object
	 */
	function getAllHeaders(request) {
		var headers, header, i, responseHeaders;
		headers = {};
		responseHeaders = request.getAllResponseHeaders().split(/\r?\n/);

		for (i = 0; i < responseHeaders.length; i += 1) {
			header = responseHeaders[i].split(": ");
			headers[header[0].toLowerCase()] = header[1];
		}

		return headers;
	}


	/**
	 * Gets a single header from a response
	 *
	 * This can throw in rare instances, thus the try/catch block
	 *
	 * @param XMLHttpRequest request
	 * @return object
	 */
	function getHeader(request, name) {
		try {
			return request.getResponseHeader(name);
		} catch (e) {
			return '';
		}
	}


	/**
	 * Gets headers that are related to CORS checks
	 *
	 * @param XMLHttpRequest request
	 * @return object
	 */
	function getCorsHeaders(request) {
		return {
			origin: getHeader(request, 'Access-Control-Allow-Origin'),
			methods: getHeader(request, 'Access-Control-Allow-Methods')
		};
	}


	/**
	 * Determine if a given method is allowed
	 *
	 * @param string method
	 * @param string headerValue What the server allows
	 * @return boolean
	 */
	function isAllowedMethod(method, headerValue) {
		headerValue = cleanHeader(headerValue);

		if (!headerValue || headerValue === '*') {
			return true;
		}

		// Make the list start and end with commas as delimiters
		headerValue = ',' + headerValue + ',';

		// Try to match ,METHOD, in our list of ,ALLOWED,METHODS,
		if (headerValue.indexOf(',' + method + ',') !== -1) {
			return true;
		}

		return false;
	}


	/**
	 * See if an origin is whitelisted by this library
	 *
	 * @param string origin
	 * @return boolean
	 */
	function isAlwaysTrusted(origin) {
		var i, isTrusted;

		for (i = 0; i < alwaysTrustedOrigins.length; i += 1) {
			if (alwaysTrustedOrigins[i] instanceof RegExp) {
				// Match the regular expression
				isTrusted = alwaysTrustedOrigins[i].test(origin);
			} else if (typeof alwaysTrustedOrigins[i] === "string") {
				// Exact string matching
				isTrusted = (origin === alwaysTrustedOrigins[i]);
			}

			if (isTrusted) {
				return true;
			}
		}

		return false;
	}


	/**
	 * Checks if the origin is always trusted or if it matches the
	 * response header's allowed origin.
	 *
	 * @param string origin
	 * @param string headerValue
	 * @return boolean
	 */
	function isTrustedOrigin(origin, headerValue) {
		origin = origin.toUpperCase();

		if (isAlwaysTrusted(origin)) {
			return true;
		}

		headerValue = cleanHeader(headerValue);

		if (headerValue === '*' || headerValue === origin) {
			return true;
		}

		return false;
	}


	/**
	 * Make a request to the server
	 *
	 * @param string method
	 * @param string uri
	 * @param Object headers
	 * @param string data Optional data to send
	 * @param Function callback Callback to call when done, callback(request)
	 * @return XMLHttpRequest
	 */
	function makeRequest(method, uri, headers, data, callback) {
		var header, request;

		request = new XMLHttpRequest();
		request.open(method, uri, true);

		if (headers) {
			for (header in headers) {
				if (headers.hasOwnProperty(header)) {
					request.setRequestHeader(header, headers[header]);
				}
			}
		}

		if (typeof data === "string") {
			request.send(data);
		} else {
			request.send(null);
		}

		if (callback) {
			request.onreadystatechange = function () {
				if (request.readyState !== 4) {
					return;
				}

				callback(request);
			};
		}

		return request;
	}

	// Opera 9.x postMessage fix (only for http:, not https:)
	if (window.opera !== undef) {
		if (parseInt(window.opera.version(), 10) === 9) {
			/*jslint nomen:true*/
			Event.prototype.__defineGetter__("origin", function () {
				return "http://" + this.domain;
			});
			/*jslint nomen:false*/
		}
	}

	function pmxdrRequestHandler(evt) {
		var data, optionsCorsHeaders, origin, source, reply;

		function sendReply(response) {
			source.postMessage(JSON.stringify(response), origin);
		}

		function replyError(code) {
			reply.error = code;
			sendReply(reply);
		}

		function handleResponse(request) {
			var corsHeaders;

			if (request.readyState !== 4) {
				return;
			}

			reply.status = request.status;
			reply.statusText = request.statusText;

			if (!request.status) {
				// Error loading the requested resource
				replyError('LOAD_ERROR');
				return;
			}

			// Handle IE's status code 1223 - see note below
			if (request.status === 1223) {
				reply.status = 204;
				reply.statusText = 'No Content';
				corsHeaders = optionsCorsHeaders;
			} else {
				corsHeaders = getCorsHeaders(request);
			}

			if (!isTrustedOrigin(origin, corsHeaders.origin)) {
				// The host was not allowed to request the resource
				replyError('DISALLOWED_ORIGIN');
				return;
			}

			if (!isAllowedMethod(data.method, corsHeaders.methods)) {
				// The request method was not allowed
				replyError('DISALLOWED_REQUEST_METHOD');
				return;
			}

			reply.data = request.responseText;
			reply.headers = getAllHeaders(request);
			sendReply(reply);
		}

		// evt gets removed by IE quickly.  We lose its information
		// unless we copy it to local variables.
		source = evt.source;
		origin = evt.origin;

		// Decode the JSON data from the event
		try {
			data = JSON.parse(evt.data);
		} catch (e) {
			return;
		}

		// Only handle pmxdr requests
		if (typeof data !== 'object' || data.pmxdr !== true) {
			return;
		}

		reply = {
			pmxdr: true
		};

		if (data.id !== undef) {
			reply.id = data.id;
		}

		if (typeof data.method === "string") {
			data.method = data.method.toUpperCase();
		}

		/* Internet Explorer <= 9 may report a status code of 1223 when
		 * there is a 204 No Content reply.  When that happens, the headers
		 * are not accessible and thus we can not check to see if the
		 * request is allowed via CORS.
		 *
		 * To combat this problem we issue an OPTIONS call.  If we use OPTIONS
		 * after our request, we may get the wrong results.  If a resource
		 * was deleted and we use OPTIONS on the deleted resource, we should
		 * properly get a 404 error or similar.  So the OPTIONS call must
		 * happen first.
		 *
		 * Issue an OPTIONS request first.  Then issue our real request.
		 * If that returns with a status code of 1223, handle IE's quirk
		 * and use the headers from the OPTIONS call for CORS.
		 */
		makeRequest('OPTIONS', data.uri, data.headers, null, function (optionsRequest) {
			optionsCorsHeaders = getCorsHeaders(optionsRequest);

			if (data.method === 'OPTIONS') {
				handleResponse(optionsRequest);
				return;
			}

			makeRequest(data.method, data.uri, data.headers, data.data, handleResponse);
		});
	}

	if (window.addEventListener) {
		window.addEventListener("message", pmxdrRequestHandler, false); // normal browsers
	} else if (window.attachEvent) {
		window.attachEvent("onmessage", pmxdrRequestHandler); // IE
	}

	// Expose to browser for testing
	window.pmxdrRequestHandler = pmxdrRequestHandler;
}());
