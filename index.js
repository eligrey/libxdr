'use strict';

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

        var hostLibUrl = conf.hostLibUrl || '//next.ft.com/assets/ft-xdr/host.min.js';
        // ie9 cors polyfill
        pmxdr.get('/api', function (req, res) {
            res.send('<!DOCTYPE html><html><head><script src="' + hostLibUrl + '"></script></head><body></body></html>')
        });

        // Provide a copy of the client side js lib
        var hostLib = require('fs').readFileSync(__dirname + 'dist/host.min.js')
        var clientLib = require('fs').readFileSync(__dirname + 'dist/client.min.js')

        pmxdr.get('/lib/host', function (req, res) {
            res.send(hostLib);
        });

        pmxdr.get('/lib/client', function (req, res) {
            res.send(clientLib);
        });

        app.use('/pmxdr', pmxdr);

        var routers = conf.routers || [app];

        routers.forEach(function (router) {
            router.use(allowCrossDomain);
        });
    }
}