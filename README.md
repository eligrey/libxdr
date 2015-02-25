A self-contained, pre-configured implementation of [libxdr](https://github.com/eligrey/libxdr) that polyfills cors in ie9

## Usage

### On API host

Create a route `/pmxdr/api` that points to a html file that loads `//next.ft.com/assets/ft-xdr.js`, or loads a copy of `/dist/main.js` from this repo. For express apps this module provides a method that will both configure regular cors headers and add this route

```js
var ftXDR = require('ft-xdr');
ftXDR.addTo(app, {
    routers: [optional array of routers to restrict cors headers to] (Default: app),
    libUrl: Location of the server side xdr library to use. (Default: //next.ft.com/assets/ft-xdr/host.js - if you're not using this module on a next FT site please don't use this default)
})

### In the client

Include the templates from next-mustard and CORS should just work in ie9.

