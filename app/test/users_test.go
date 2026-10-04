package test

import (
	"strings"
	"testing"
	"todo-app/app/db/users"
)

func TestHashAndVerifyPassword(t *testing.T) {
	password := "superSecret123"
	encoded, err := users.HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if !strings.HasPrefix(encoded, "$argon2id$") {
		t.Fatalf("expected $argon2id$ prefix, got %s", encoded)
	}

	valid, err := users.VerifyPassword(password, encoded)
	if err != nil {
		t.Fatalf("VerifyPassword failed: %v", err)
	}
	if !valid {
		t.Fatalf("expected password verification to succeed")
	}

	invalid, err := users.VerifyPassword("wrongPassword", encoded)
	if err != nil {
		t.Fatalf("VerifyPassword errored on wrong pass: %v", err)
	}
	if invalid {
		t.Fatalf("expected wrong password to fail verification")
	}
}
