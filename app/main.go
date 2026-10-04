package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"todo-app/app/db"
	"todo-app/app/routes"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		if err := godotenv.Load(".env"); err != nil {
			log.Println("Notice: .env file not found, reading system environment variables")
		}
	}

	ctx := context.Background()
	_, err := db.Connect(ctx)
	if err != nil {
		log.Printf("Database connection notice: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()
	routes.SetupRoutes(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	serverAddr := ":" + port
	server := &http.Server{
		Addr:              serverAddr,
		Handler:           mux,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("Server listening on port %s...", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server stopped with error: %v", err)
	}
}
