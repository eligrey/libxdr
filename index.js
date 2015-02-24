var express = require('express');

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-FT-UID, Content-Type, X-FT-SESSION');
    next();
};

module.exports = {
    addTo: function (app, conf) {

        var pmxdr = express.Router();
        pmxdr.use(function(req, res, next) {
            // it's a simple iframe that loads a single script - can cache really heavily
            res.set('max-age=290304000, public');
            next();
        });

        var libUrl = conf.libUrl || (conf.libUrl === 'local' ? '/pmxdr/lib' : '//next.ft.com/assets/ft-xdr.js');
        // ie9 cors polyfill
        pmxdr.get('/api', function (req, res) {
            res.send('<!DOCTYPE html><html><head><script src="' + libUrl + '"></script></head><body></body></html>')
        });

        // Provide a copy of the client side js lib
        var libContent = require('fs').readFileSync(__dirname + 'dist/main.js')

        pmxdr.get('/lib', function (req, res) {
            res.send(libContent);
        });

        app.use('/pmxdr', pmxdr);

        var routers = conf.routers || [app];

        routers.forEach(function (router) {
            router.use(allowCrossDomain);
        });
    }
}