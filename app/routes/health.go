package routes

import (
	"net/http"
)

func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "Production Todo API is running",
	})
}
