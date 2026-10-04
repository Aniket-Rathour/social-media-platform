package test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"todo-app/app/middleware"
)

func TestTokenGenerationAndVerification(t *testing.T) {
	userID := int64(42)
	username := "testuser"

	token, err := middleware.GenerateToken(userID, username)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	claims, err := middleware.VerifyToken(token)
	if err != nil {
		t.Fatalf("VerifyToken failed: %v", err)
	}

	if claims.UserID != userID {
		t.Fatalf("expected userID %d, got %d", userID, claims.UserID)
	}

	if claims.Username != username {
		t.Fatalf("expected username %s, got %s", username, claims.Username)
	}

	_, err = middleware.VerifyToken(token + "tampered")
	if err == nil {
		t.Fatalf("expected tampered token to fail verification")
	}
}

func TestRequireAuthMiddleware(t *testing.T) {
	handler := middleware.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := middleware.GetUserFromContext(r.Context())
		if !ok || claims.Username != "validuser" {
			http.Error(w, "bad context", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rec := httptest.NewRecorder()
	handler(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized without cookie, got %d", rec.Code)
	}

	token, err := middleware.GenerateToken(10, "validuser")
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	reqWithCookie := httptest.NewRequest(http.MethodGet, "/protected", nil)
	reqWithCookie.AddCookie(&http.Cookie{
		Name:  "token",
		Value: token,
	})
	recWithCookie := httptest.NewRecorder()
	handler(recWithCookie, reqWithCookie)

	if recWithCookie.Code != http.StatusOK {
		t.Fatalf("expected 200 OK with valid cookie, got %d", recWithCookie.Code)
	}
}
