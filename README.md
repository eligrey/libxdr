libxdr is a JavaScript library that implements a cross-browser cross-domain requesting `XDR` constructor that uses the [pmxdr standard][1]. libxdr is built on top of the [pmxdr client library][2] and requires it to function.

libxdr is meant to make it easy to use pmxdr in your JavaScript code as you can just replace `XMLHttpRequest` with `XDR` wherever you want to make a cross-domain request. libxdr's `XDR` constructor implements every ethod supported by XMLHttpRequest and defined in the [XMLHttpRequest Object standard][3].

  [1]: http://eligrey.com/blog/projects/pmxdr/standard
  [2]: http://eligrey.com/blog/projects/pmxdr#client-library
  [3]: http://www.w3.org/TR/XMLHttpRequest/
