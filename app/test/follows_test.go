package test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"todo-app/app/middleware"
	"todo-app/app/routes"
)

func TestSelfFollowRejection(t *testing.T) {
	mux := http.NewServeMux()
	routes.SetupRoutes(mux)

	token, err := middleware.GenerateToken(1, "aniket")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	body, _ := json.Marshal(map[string]string{
		"target_username": "aniket",
	})

	req := httptest.NewRequest(http.MethodPost, "/users/follow", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{
		Name:  "token",
		Value: token,
	})

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for self-follow, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestUnauthenticatedFollow(t *testing.T) {
	mux := http.NewServeMux()
	routes.SetupRoutes(mux)

	body, _ := json.Marshal(map[string]string{
		"target_username": "john_doe",
	})

	req := httptest.NewRequest(http.MethodPost, "/users/follow", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for unauthenticated follow, got %d", rec.Code)
	}
}
