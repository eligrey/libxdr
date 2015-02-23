.PHONY: dist

dist:
	node_modules/.bin/browserify src/main.js | node_modules/.bin/uglifyjs - > dist/main.js