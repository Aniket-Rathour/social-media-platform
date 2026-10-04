package routes

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"todo-app/app/db"
	"todo-app/app/db/posts"
	"todo-app/app/middleware"

	"github.com/jackc/pgx/v5/pgconn"
)

type CreatePostRequest struct {
	UserID  *int64 `json:"user_id"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

func postsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var req CreatePostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
			return
		}

		req.Title = strings.TrimSpace(req.Title)
		req.Content = strings.TrimSpace(req.Content)

		if req.Title == "" || req.Content == "" {
			writeError(w, http.StatusBadRequest, "title and content are required")
			return
		}

		if req.UserID == nil {
			if cookie, err := r.Cookie("token"); err == nil && cookie.Value != "" {
				if claims, err := middleware.VerifyToken(cookie.Value); err == nil {
					req.UserID = &claims.UserID
				}
			}
		}

		post, err := posts.Create(r.Context(), db.Pool, req.UserID, req.Title, req.Content)
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23503" {
				writeError(w, http.StatusBadRequest, "Referenced user does not exist")
				return
			}
			writeError(w, http.StatusInternalServerError, "Failed to create post: "+err.Error())
			return
		}

		writeJSON(w, http.StatusCreated, post)

	case http.MethodGet:
		userIDStr := r.URL.Query().Get("user_id")
		if userIDStr != "" {
			userID, err := strconv.ParseInt(userIDStr, 10, 64)
			if err != nil {
				writeError(w, http.StatusBadRequest, "Invalid user_id query parameter")
				return
			}

			userPosts, err := posts.GetByUserID(r.Context(), db.Pool, userID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "Failed to fetch user posts: "+err.Error())
				return
			}
			if userPosts == nil {
				userPosts = []*posts.Post{}
			}
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"posts": userPosts,
			})
			return
		}

		allPosts, err := posts.GetAll(r.Context(), db.Pool)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch posts: "+err.Error())
			return
		}
		if allPosts == nil {
			allPosts = []*posts.Post{}
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"posts": allPosts,
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}
