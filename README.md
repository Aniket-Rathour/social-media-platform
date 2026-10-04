# Social Media Platform ⚡

A high-concurrency, production-grade social backend and client built in Go and PostgreSQL, featuring an indexed relational social graph, cryptographic password derivation, and stateful HTTP-only JWT sessions.

---

### Core Architecture

- **Social Graph Engine**: Asymmetric follow/unfollow architecture with `ON DELETE CASCADE`, self-follow prevention, and composite primary keys. Users can follow creators and remove followers from their profile.
- **Relational Posts**: `BIGINT GENERATED ALWAYS AS IDENTITY` primary keys with `ON DELETE SET NULL` cascades, ensuring posts persist when a creator is removed.
- **Argon2id Cryptography**: Salted password derivation with dynamic runtime parameter parsing (time, memory, threads, salt, hash) and constant-time verification.
- **JWT Device Sessions**: Automatic issuance and revocation of `HttpOnly`, `SameSite=Lax` cookies with HMAC SHA-256 signature verification.
- **PostgreSQL Connection Pooling (`pgxpool`)**: Scalable pool lifecycle management with automated health checks.
- **Production Server Hardening**: Configured with strict read, write, idle, and header timeouts.
- **Interactive React Client & Live API Inspector**: Modern dark mode SPA built with React 19, Tailwind CSS v4, and Lucide icons at `http://localhost:8080/`.

---

### Verified Benchmarks (Apple M4 • darwin/arm64)

Benchmarked using Go's official `testing.B` harness with memory allocation tracking:

| Benchmark | Operations | Latency | Memory / Op | Allocations / Op |
| :--- | :--- | :--- | :--- | :--- |
| `BenchmarkJWTGenerate` | 457,982 | **2.48 µs/op** | 2,314 B/op | 34 allocs/op |
| `BenchmarkJWTVerify` | 298,569 | **3.96 µs/op** | 2,832 B/op | 50 allocs/op |
| `BenchmarkArgon2Hash` | 36 | **36.8 ms/op** | 67.1 MB/op | 68 allocs/op |
| `BenchmarkArgon2Verify` | 32 | **37.4 ms/op** | 67.1 MB/op | 60 allocs/op |

*Argon2id uses 64 MB RAM, 2 iterations, and 4 threads to guarantee high resistance against hardware and ASIC/GPU cracking.*

---

### API Reference

#### Authentication
- `POST /users`: Register account and receive HTTP-only JWT cookie
- `POST /login`: Authenticate and receive HTTP-only JWT cookie
- `POST /logout`: Clear device session cookie
- `GET /me`: Inspect active session (Protected)

#### Social Graph
- `POST /users/follow`: Follow target user by username (Protected)
- `POST /users/unfollow`: Unfollow target user by username (Protected)
- `POST /users/remove-follower`: Remove a user from your followers (Protected)
- `GET /users/followers?username=`: Retrieve list of followers
- `GET /users/following?username=`: Retrieve list of accounts followed
- `GET /users/stats?username=`: Follower and following counts

#### Posts & Health
- `POST /posts`: Publish post (auto-binds to authenticated user session)
- `GET /posts`: List all posts (or filter with `?user_id=`)
- `GET /health`: System health monitor

---

### Quick Start

```bash
# 1. Environment Configuration
cp .env.example .env

# 2. Database Migrations
goose -dir migration postgres "$DB_STRING" up

# 3. Build React Client & Launch Platform
cd app/client && npm install && npm run build && cd ../..
go run ./app
```

Client UI & API Inspector: `http://localhost:8080/`
