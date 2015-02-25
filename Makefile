.PHONY: dist

dist:
	node_modules/.bin/browserify src/client.js > dist/client.js
	node_modules/.bin/uglifyjs dist/client.js --screw-ie8 --preamble "/*! @source https://github.com/Financial-Times/ft-xdr/blob/master/src/libxdr.js*/" > dist/client.min.js
	cp src/pmxdr-host.js dist/host.js
	node_modules/.bin/uglifyjs dist/host.js --screw-ie8 --preamble "/*! @source https://github.com/Financial-Times/ft-xdr/blob/master/src/pmxdr-host.js*/" > dist/host.min.js