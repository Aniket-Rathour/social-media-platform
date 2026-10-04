package test

import (
	"testing"
	"todo-app/app/middleware"
	"todo-app/app/db/users"
)

func BenchmarkArgon2Hash(b *testing.B) {
	password := "superSecretBenchPassword123"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := users.HashPassword(password)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkArgon2Verify(b *testing.B) {
	password := "superSecretBenchPassword123"
	hash, err := users.HashPassword(password)
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		valid, err := users.VerifyPassword(password, hash)
		if err != nil || !valid {
			b.Fatal("verification failed during benchmark")
		}
	}
}

func BenchmarkJWTGenerate(b *testing.B) {
	userID := int64(1001)
	username := "benchmark_user"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := middleware.GenerateToken(userID, username)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkJWTVerify(b *testing.B) {
	userID := int64(1001)
	username := "benchmark_user"
	token, err := middleware.GenerateToken(userID, username)
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := middleware.VerifyToken(token)
		if err != nil {
			b.Fatal(err)
		}
	}
}
