'use strict';

require('./pmxdr-host');
require('./pmxdr-client');
window.XMLHttpRequest = require('./libxdr');

typeof ftXDRLoaded==='function' && ftXDRLoaded();