A self-contained, pre-configured implementation of [libxdr](https://github.com/eligrey/libxdr) that polyfills cors in ie9 (and ie8 if it's ever needed);

## Usage

### On API host

Create a route `/pmxdr/api` that points to a html file that loads `//next.ft.com/assets/ft-xdr.js`

### In the client

Include the templates from next-mustard and CORS should just work in ie9.