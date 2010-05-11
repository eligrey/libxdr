libxdr is a library that implements a cross-browser (postMessage-supporting browsers only) cross-domain request constructor, `XDR`, using [pmxdr][1]. It's API is identical to the [XMLHttpRequest API][2] so you can drop it into existing code without making any changes other than replacing `XMLHttpRequest` with `XHR`. It also supports IE8's XDomainRequest API (eg. `onload`). Please note that a page on a website being requested must, in addition serving to the appropriate [HTTP access control][3] header(s), also have a [pmxdr host][4] located at **/pmxdr/api** (not just the script data, but HTML using the script) on the website. libxdr *does not* support synchronous requests. The `isAsynchronous` (third) argument in the open method is optional due to there being only one legal value, `true`.

Every browser compatible with pmxdr is compatible with libxdr. See the [supported browsers list][5] for more info. libxdr requires that pmxdr be loaded before libxdr is loaded.

## Status codes

pmxdr responses sometimes include error codes if the request was denied. libxdr simulates the following HTTP status for their corresponding error codes:

*   `DISALLOWED_REQUEST_METHOD`: 405 Method Not Allowed
*   `TIMEOUT`: 408 Request Timeout
*   `DISALLOWED_ORIGIN`: 412 Precondition Failed

## Examples

### Very simple get responseText

    var request = new XDR();
    request.open("GET", "http://code.eligrey.com/pmxdr/libxdr/example.php");
    request.onload = function() {
        alert(this.responseText);
    }
    request.send();

### Getting the "example" attribute from some XML

This exmple demonstrates a working responseXML and setting the onload handler.

    var request = new XDR();
    request.open("GET", "http://code.eligrey.com/pmxdr/libxdr/example.php");
    request.onload = function() {
        alert(this.responseXML.documentElement.getAttribute("example"));
        // alerts "blah"
    };
    request.send();

### onreadystatechange, Content-Type, responseText.length, and ontimeout

    var request = new XDR();
    request.open("GET", "http://code.eligrey.com/pmxdr/libxdr/example.php");
    request.timeout = 5000; // timeout after 5 seconds (5000ms)
    request.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            alert(this.responseText.length); // alerts 120
            alert(this.contentType); // alerts "text/xml"
        }
    };
    request.ontimeout = function() {
        alert("Is your Internet connection connection always this slow?")
    };
    request.send();

### getResponseHeader

    var request = new XDR();
    request.open("GET", "http://code.eligrey.com/pmxdr/libxdr/example.php");
    request.onload = function() {
        alert(this.getResponseHeader("X-Foo")); // alerts "bar"
    };
    request.send();

### A simple POST request

    var request = new XDR();
    request.open("POST", "http://code.eligrey.com/pmxdr/libxdr/example2.php");
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.onload = function() {
        alert(this.responseText); // alerts "foo is bar"
    };
    request.send("foo=bar");

### Aborting a request

    var request = new XDR();
    request.open("GET", "http://code.eligrey.com/pmxdr/libxdr/example.php");
    request.onload = function() {
        alert("You shouldn't see this.");
    }
    request.send();
    request.abort();

### onerror handling an invalid request method

In this example, a resource which only allows the POST request method is requested using the GET method. This will cause an error and give an HTTP 405 Method Not Allowed status code.

    var request = new XDR();
    request.open("GET", "http://code.eligrey.com/pmxdr/libxdr/example2.php");
    request.onerror = function() {
        alert("HTTP status response is " + this.status + " " + this.statusText);
    }
    request.send();

### Getting all response headers with a HEAD request

    var request = new XDR();
    request.open("HEAD", "http://code.eligrey.com/pmxdr/libxdr/example.php");
    request.onload = function() {
        alert(this.getAllResponseHeaders());
    }
    request.send();


![Tracking image](//in.getclicky.com/212712ns.gif =1x1)


 [1]: http://github.com/eligrey/pmxdr
 [2]: http://www.w3.org/TR/XMLHttpRequest/
 [3]: https://developer.mozilla.org/En/HTTP_access_control
 [4]: http://github.com/eligrey/pmxdr/blob/master/pmxdr-host.js
 [5]: http://github.com/eligrey/pmxdr#readme
