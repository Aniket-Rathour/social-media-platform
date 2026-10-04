package routes

import (
	"encoding/json"
	"net/http"
	"os"

	"todo-app/app/middleware"
)

func SetupRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", healthCheckHandler)
	mux.HandleFunc("/users", usersHandler)
	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/logout", logoutHandler)
	mux.HandleFunc("/me", middleware.RequireAuth(meHandler))
	mux.HandleFunc("/posts", postsHandler)

	mux.HandleFunc("/users/follow", middleware.RequireAuth(followUserHandler))
	mux.HandleFunc("/users/unfollow", middleware.RequireAuth(unfollowUserHandler))
	mux.HandleFunc("/users/remove-follower", middleware.RequireAuth(removeFollowerHandler))
	mux.HandleFunc("/users/followers", followersListHandler)
	mux.HandleFunc("/users/following", followingListHandler)
	mux.HandleFunc("/users/stats", followStatsHandler)

	clientDir := "app/client"
	if _, err := os.Stat(clientDir); os.IsNotExist(err) {
		clientDir = "client"
	}
	mux.Handle("/", http.FileServer(http.Dir(clientDir)))
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}
