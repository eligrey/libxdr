'use strict';

require('./pmxdr-client');
require('./libxdr');

module.exports = window.XDR;

window.XDR.polyfill = function () {
    window.XDR._XMLHttpRequest = window.XMLHttpRequest;
    window.XMLHttpRequest = window.XDR;
};

typeof ftXDRLoaded==='function' && ftXDRLoaded();