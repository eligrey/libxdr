.PHONY: dist

dist:
	node_modules/.bin/browserify src/main.js | node_modules/.bin/uglifyjs - --screw-ie8 --preamble "/*! @source https://github.com/Financial-Times/ft-xdr/blob/master/src/libxdr.js*/"> dist/main.js