dev-front:
	cd ./front && npm run dev

dev-back:
	cd ./back && npm run start:dev

install-back:
	cd ./front && npm i

install:
	cd ./front && rm -f package-lock.json && npm i
	cd ./back && npm i

lint-front:
	cd ./front && npm run lint

lint-back:
	cd ./back && npm run lint

test-back:
	cd ./back && npm run test

test-front:
	cd ./front && npm run test

lint:
	cd ./front && npm run lint
	cd ./back && npm run lint

test:
	cd ./back && npm run test
	cd ./front && npm run test

.PHONY: dev lint test install
