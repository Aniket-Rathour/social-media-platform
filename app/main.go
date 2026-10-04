package main

import (
	"log"
	"net/http"
	"os"

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

	_, err := db.Connect()
	if err != nil {
		log.Printf("Database connection notice: %v", err)
	}

	mux := http.NewServeMux()
	routes.SetupRoutes(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	serverAddr := ":" + port
	log.Printf("Server listening on port %s...", port)
	if err := http.ListenAndServe(serverAddr, mux); err != nil {
		log.Fatalf("Server stopped with error: %v", err)
	}
}
