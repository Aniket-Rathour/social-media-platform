package routes

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"todo-app/app/db"
	"todo-app/app/db/users"
	"todo-app/app/middleware"

	"github.com/jackc/pgx/v5/pgconn"
)

type CreateUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(req.Email)
	req.Password = strings.TrimSpace(req.Password)

	if req.Username == "" || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "username, email, and password are required")
		return
	}

	user, err := users.Insert(r.Context(), db.Pool, req.Username, req.Email, req.Password)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeError(w, http.StatusConflict, "Username or email already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to create user: "+err.Error())
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "User created but failed to generate token: "+err.Error())
		return
	}

	middleware.SetAuthCookie(w, token)

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "User created successfully",
		"token":   token,
		"user":    user,
	})
}
