# Production Level Todo

A high-performance Todo service built with Go and PostgreSQL.

## Features

- PostgreSQL with `BIGINT GENERATED ALWAYS AS IDENTITY` primary keys
- Database migrations with Goose
- Connection pooling via `DB_STRING`
- Modular architecture with clean separation of concerns (`app/db`, `app/routes`)

## Getting Started

### Prerequisites

- Go 1.25+
- PostgreSQL
- Goose CLI (`go install github.com/pressly/goose/v3/cmd/goose@latest`)

### Setup

1. Copy `.env.example` to `.env` and fill in your PostgreSQL connection string:
   ```bash
   cp .env.example .env
   ```

2. Run database migrations:
   ```bash
   goose -dir migration postgres "$DB_STRING" up
   ```

3. Run the application:
   ```bash
   go run ./app
   ```
