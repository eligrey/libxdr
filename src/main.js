'use strict';

require('./pmxdr-host');
require('./pmxdr-client');
window.XHTMLHttpRequest = require('./libxdr');

typeof ftXDRLoaded==='function' && ftXDRLoaded();