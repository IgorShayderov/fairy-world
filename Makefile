front-dev:
	cd ./front && npm run dev

back-dev:
	cd ./back && npm run start:dev

front-install:
	cd ./front && npm i

install:
	cd ./front && rm -f package-lock.json && npm i

lint:
	cd ./front && npm run lint

test:
	cd ./front && npm run test

.PHONY: dev lint test install
