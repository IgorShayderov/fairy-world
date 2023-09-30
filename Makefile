install:
	npm ci

dev:
	dev-front

dev-front:
	npm --prefix ./front run dev

build:
	build-front

build-front:
	npm --prefix ./front run build

test:
	test-front

test-front:
	npm --prefix ./front run test

lint:
	lint-front

lint-front:
	npm --prefix ./front run lint

