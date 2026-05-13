.PHONY: lint test build

lint:
	docker compose run --rm --no-deps web sh -c "npm ci && npm run lint"

test:
	docker compose run --rm --no-deps api sh -c "pip install -e '.[dev]' && pytest"
	docker compose run --rm --no-deps web sh -c "npm ci && npm run lint && npm run build"

build:
	docker compose run --rm --no-deps web sh -c "npm ci && npm run build"
