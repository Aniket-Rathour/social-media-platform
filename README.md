# Production Todo Platform ⚡

A high-performance, battle-tested Go backend paired with a real-time client, engineered with production PostgreSQL standards.

---

### Core Architecture

- **PostgreSQL & `pgxpool`**: High-concurrency connection pooling with health monitoring.
- **Relational Integrity**: `BIGINT GENERATED ALWAYS AS IDENTITY` primary keys with `ON DELETE SET NULL` cascade protection.
- **Argon2id Cryptography**: Dynamic memory/time/thread parameter parsing with constant-time verification.
- **JWT Cookie Authentication**: HTTP-only, SameSite device sessions with cryptographic signature verification.
- **Production HTTP Server**: Hardened with strict read, write, idle, and header timeouts.
- **Goose Migrations**: Versioned database schema evolution.
- **Built-in Client & API Inspector**: Real-time dark mode dashboard for testing and monitoring.

---

### Quick Start

```bash
# 1. Environment
cp .env.example .env

# 2. Database Migrations
goose -dir migration postgres "$DB_STRING" up

# 3. Launch Server & Client
go run ./app
```

Client UI & API Explorer: `http://localhost:8080/`
