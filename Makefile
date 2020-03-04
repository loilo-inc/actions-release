main: lib/index.js
lib/index.js: src/main.ts src/create-release.ts
	yarn ncc build src/main.ts -o lib
test:
	docker run \
		-v `pwd`:/src \
		-w /src \
		-t node:12.13 \
		yarn test
