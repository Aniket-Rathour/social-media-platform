package users

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/argon2"
)

const (
	ArgonTime    uint32 = 2
	ArgonMemory  uint32 = 64 * 1024
	ArgonThreads uint8  = 4
	ArgonKeyLen  uint32 = 32
	SaltLength   uint32 = 16
)

type User struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	HashPass  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func HashPassword(password string) (string, error) {
	salt := make([]byte, SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("failed to generate random salt: %w", err)
	}

	hash := argon2.IDKey([]byte(password), salt, ArgonTime, ArgonMemory, ArgonThreads, ArgonKeyLen)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encoded := fmt.Sprintf("$argon2id$v=%d$t=%d$m=%d$p=%d$%s$%s",
		argon2.Version, ArgonTime, ArgonMemory, ArgonThreads, b64Salt, b64Hash)

	return encoded, nil
}

func VerifyPassword(password, encodedHash string) (bool, error) {
	rawParts := strings.Split(encodedHash, "$")
	var parts []string
	for _, p := range rawParts {
		if p != "" {
			parts = append(parts, p)
		}
	}

	if len(parts) < 6 {
		return false, errors.New("invalid encoded hash format")
	}

	algo := parts[0]
	if algo != "argon2id" && algo != "argon2i" {
		return false, fmt.Errorf("unsupported hash algorithm: %s", algo)
	}

	var version int
	var iterations uint32
	var memory uint32
	var threads uint8
	var b64Salt, b64Hash string

	for _, part := range parts[1:] {
		if strings.HasPrefix(part, "v=") {
			v, err := strconv.Atoi(strings.TrimPrefix(part, "v="))
			if err != nil {
				return false, err
			}
			version = v
		} else if strings.HasPrefix(part, "t=") {
			t, err := strconv.ParseUint(strings.TrimPrefix(part, "t="), 10, 32)
			if err != nil {
				return false, err
			}
			iterations = uint32(t)
		} else if strings.HasPrefix(part, "m=") {
			m, err := strconv.ParseUint(strings.TrimPrefix(part, "m="), 10, 32)
			if err != nil {
				return false, err
			}
			memory = uint32(m)
		} else if strings.HasPrefix(part, "p=") {
			p, err := strconv.ParseUint(strings.TrimPrefix(part, "p="), 10, 8)
			if err != nil {
				return false, err
			}
			threads = uint8(p)
		} else if b64Salt == "" {
			b64Salt = part
		} else if b64Hash == "" {
			b64Hash = part
		}
	}

	if version == 0 || iterations == 0 || memory == 0 || threads == 0 || b64Salt == "" || b64Hash == "" {
		return false, errors.New("missing parameters in encoded hash")
	}

	salt, err := base64.RawStdEncoding.DecodeString(b64Salt)
	if err != nil {
		return false, fmt.Errorf("failed to decode salt: %w", err)
	}

	expectedHash, err := base64.RawStdEncoding.DecodeString(b64Hash)
	if err != nil {
		return false, fmt.Errorf("failed to decode hash: %w", err)
	}

	keyLen := uint32(len(expectedHash))
	var comparisonHash []byte
	if algo == "argon2id" {
		comparisonHash = argon2.IDKey([]byte(password), salt, iterations, memory, threads, keyLen)
	} else {
		comparisonHash = argon2.Key([]byte(password), salt, iterations, memory, threads, keyLen)
	}

	if subtle.ConstantTimeCompare(expectedHash, comparisonHash) == 1 {
		return true, nil
	}

	return false, nil
}

func Insert(ctx context.Context, pool *pgxpool.Pool, name, email, pass string) (*User, error) {
	hashPass, err := HashPassword(pass)
	if err != nil {
		return nil, fmt.Errorf("password hashing failed: %w", err)
	}

	query := `
		INSERT INTO users (username, email, hash_pass)
		VALUES ($1, $2, $3)
		RETURNING id, username, email, hash_pass, created_at, updated_at
	`

	var user User
	err = pool.QueryRow(ctx, query, name, email, hashPass).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.HashPass,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}

	return &user, nil
}

func Login(ctx context.Context, pool *pgxpool.Pool, identifier, pass string) (*User, error) {
	query := `
		SELECT id, username, email, hash_pass, created_at, updated_at
		FROM users
		WHERE username = $1 OR email = $1
		LIMIT 1
	`

	var user User
	err := pool.QueryRow(ctx, query, identifier).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.HashPass,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials or user not found")
	}

	valid, err := VerifyPassword(pass, user.HashPass)
	if err != nil || !valid {
		return nil, errors.New("invalid credentials")
	}

	return &user, nil
}
