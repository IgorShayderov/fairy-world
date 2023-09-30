install:
	npm ci

dev:
	dev-front
	dev-back

dev-front:
	npm --prefix ./front run dev

dev-back:
	npm --prefix ./back start:dev

build:
	build-front
	build-back

build-front:
	npm --prefix ./front run build

build-back:
	npm --prefix ./back run build

test:
	test-front
	test-back

test-front:
	npm --prefix ./front run test

test-back:
	npm --prefix ./back run test

lint:
	lint-front

lint-front:
	npm --prefix ./front run lint

lint-back:
	npm --prefix ./back run lint
