package routes

import (
	"encoding/json"
	"net/http"
	"strings"

	"todo-app/app/db"
	"todo-app/app/db/users"
	"todo-app/app/middleware"
)

type LoginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	req.Identifier = strings.TrimSpace(req.Identifier)
	req.Password = strings.TrimSpace(req.Password)

	if req.Identifier == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "identifier and password are required")
		return
	}

	user, err := users.Login(r.Context(), db.Pool, req.Identifier, req.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate token: "+err.Error())
		return
	}

	middleware.SetAuthCookie(w, token)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Login successful",
		"token":   token,
		"user":    user,
	})
}
