/* libxdr: Cross-browser cross-domain request library
@version 0.0.1
@requires pmxdr client library, http://code.eligrey.com/pmxdr/client/
@archive http://code.eligrey.com/pmxdr/libxdr/
@desc Implements XDR cross-domain request constructor using the pmxdr client library
@license GPL v3 and X11/MIT License
         http://eligrey.com/about/license/
@author Elijah Grey, http://eligrey.com
*/

if (!this.XDR) {
  this.XDR = new Function();
  
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
          if (response.error == "DISALLOWED_REQUEST_METHOD") {
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
        
        
        if (typeof instance.onerror == "function" && response.error)
          return instance.onerror();
        
        if (typeof instance.ontimeout == "function" && instance.status == 408)
          return instance.ontimeout();
    
        var xmlDocument = null; // parse response.data and simulate responseXML
        try {
          xmlDocument = (new DOMParser()).parseFromString(response.data, "application/xml");
        } catch(e) {
          try {
            xmlDocument = new ActiveXObject("Microsoft.XMLDOM");
            xmlDocument.loadXML(response.data);
          } catch(e) {
            xmlDocument = null;
          }
        }
          
        instance.responseXML = xmlDocument;
        
        instance.responseText = response.data;
        
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
          
          
        if (instance.timeout) instance._request.timeout = instance.timeout;
        else if(XDR.defaultTimeout) instance._request.timeout = XDR.defaultTimeout;
          
        if (typeof instance.onreadystatechange == "function")
          instance.onreadystatechange();
        if (typeof instance.onprogress == "function")
          instance.onprogress();
        if (typeof instance.onload == "function")
          instance.onload();
         
      };
        
        
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
