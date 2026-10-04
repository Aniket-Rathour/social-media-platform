package routes

import (
	"encoding/json"
	"net/http"
	"strings"

	"todo-app/app/db"
	"todo-app/app/db/follows"
	"todo-app/app/middleware"
)

type TargetUserRequest struct {
	TargetUsername string `json:"target_username"`
}

type RemoveFollowerRequest struct {
	FollowerUsername string `json:"follower_username"`
}

func followUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req TargetUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	req.TargetUsername = strings.TrimSpace(req.TargetUsername)
	if req.TargetUsername == "" {
		writeError(w, http.StatusBadRequest, "target_username is required")
		return
	}

	if claims.Username == req.TargetUsername {
		writeError(w, http.StatusBadRequest, "cannot follow yourself")
		return
	}

	err := follows.Follow(r.Context(), db.Pool, claims.UserID, req.TargetUsername)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Successfully followed @" + req.TargetUsername,
	})
}

func unfollowUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req TargetUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	req.TargetUsername = strings.TrimSpace(req.TargetUsername)
	if req.TargetUsername == "" {
		writeError(w, http.StatusBadRequest, "target_username is required")
		return
	}

	if claims.Username == req.TargetUsername {
		writeError(w, http.StatusBadRequest, "cannot unfollow yourself")
		return
	}

	err := follows.Unfollow(r.Context(), db.Pool, claims.UserID, req.TargetUsername)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Successfully unfollowed @" + req.TargetUsername,
	})
}

func removeFollowerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req RemoveFollowerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	req.FollowerUsername = strings.TrimSpace(req.FollowerUsername)
	if req.FollowerUsername == "" {
		writeError(w, http.StatusBadRequest, "follower_username is required")
		return
	}

	if claims.Username == req.FollowerUsername {
		writeError(w, http.StatusBadRequest, "cannot remove yourself from followers")
		return
	}

	err := follows.RemoveFollower(r.Context(), db.Pool, claims.UserID, req.FollowerUsername)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Removed @" + req.FollowerUsername + " from your followers",
	})
}

func followersListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	username := strings.TrimSpace(r.URL.Query().Get("username"))
	if username == "" {
		claims, ok := middleware.GetUserFromContext(r.Context())
		if ok {
			username = claims.Username
		} else {
			writeError(w, http.StatusBadRequest, "username query parameter is required")
			return
		}
	}

	list, err := follows.GetFollowers(r.Context(), db.Pool, username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"username":  username,
		"followers": list,
	})
}

func followingListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	username := strings.TrimSpace(r.URL.Query().Get("username"))
	if username == "" {
		claims, ok := middleware.GetUserFromContext(r.Context())
		if ok {
			username = claims.Username
		} else {
			writeError(w, http.StatusBadRequest, "username query parameter is required")
			return
		}
	}

	list, err := follows.GetFollowing(r.Context(), db.Pool, username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"username":  username,
		"following": list,
	})
}

func followStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	username := strings.TrimSpace(r.URL.Query().Get("username"))
	if username == "" {
		claims, ok := middleware.GetUserFromContext(r.Context())
		if ok {
			username = claims.Username
		} else {
			writeError(w, http.StatusBadRequest, "username query parameter is required")
			return
		}
	}

	stats, err := follows.GetCounts(r.Context(), db.Pool, username)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"username": username,
		"stats":    stats,
	})
}
