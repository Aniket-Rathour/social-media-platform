package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Connect() (*sql.DB, error) {
	connStr := os.Getenv("DB_STRING")
	if connStr == "" {
		return nil, fmt.Errorf("DB_STRING environment variable is not set")
	}

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err = DB.Ping(); err != nil {
		log.Printf("Warning: failed to ping database: %v", err)
		return DB, err
	}

	log.Println("Database connection established successfully")
	return DB, nil
}
