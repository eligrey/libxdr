/* libxdr: Cross-browser cross-domain request library
@version 0.0.1
@requires pmxdr client library, http://code.eligrey.com/pmxdr/client/
@archive http://code.eligrey.com/pmxdr/libxdr/
@desc Implements XDR cross-domain request constructor using the pmxdr client library
@license X11/MIT
@author Eli Grey, http://eligrey.com
*/

/*! @source http://purl.eligrey.com/github/libxdr/blob/master/libxdr.js*/

if (!this.XDR) {
  this.XDR = function () {};
  
  //XDR.defaultTimeout = 10000; // default timeout; 10000 is IE8's default for similar XDomainRequest

  XDR.prototype = {
  
    open: function (method, uri, async) {
      if (async === false)
        throw new RangeError("XDR.open: libxdr does not support synchronous requests.");

      this._request = { // request object for pmxdr.request
        method : method,
        uri    : uri,
        headers: {}
      }
    },
      
    setRequestHeader: function(header, value) {
      this._request.headers[header.toLowerCase()] = value;
    },
    
    removeRequestHeader: function(header) {
      delete this._request.headers[header.toLowerCase()];
    },
      
    send: function (data) {
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
    },
  
    abort: function() { // default abort
      delete this._request;
    }
  }
}
