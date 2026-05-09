front-dev:
	cd ./front && npm run dev

back-dev:
	cd ./back && npn run start:dev

front-install:
	cd ./front && npm i

install:
	cd ./front && npm ci

lint:
	cd ./front && npm run lint

test:
	cd ./front && npm run test

.PHONY: dev lint test install
