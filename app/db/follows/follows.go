package follows

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserSummary struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type FollowStats struct {
	FollowersCount int64 `json:"followers_count"`
	FollowingCount int64 `json:"following_count"`
}

func Follow(ctx context.Context, pool *pgxpool.Pool, followerID int64, targetUsername string) error {
	if pool == nil {
		return errors.New("database connection pool not initialized")
	}

	var targetID int64
	err := pool.QueryRow(ctx, "SELECT id FROM users WHERE username = $1", targetUsername).Scan(&targetID)
	if err != nil {
		return fmt.Errorf("target user not found")
	}

	if followerID == targetID {
		return errors.New("cannot follow yourself")
	}

	query := `
		INSERT INTO follows (follower_id, following_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`
	_, err = pool.Exec(ctx, query, followerID, targetID)
	if err != nil {
		return fmt.Errorf("failed to follow user: %w", err)
	}

	return nil
}

func Unfollow(ctx context.Context, pool *pgxpool.Pool, followerID int64, targetUsername string) error {
	if pool == nil {
		return errors.New("database connection pool not initialized")
	}

	var targetID int64
	err := pool.QueryRow(ctx, "SELECT id FROM users WHERE username = $1", targetUsername).Scan(&targetID)
	if err != nil {
		return fmt.Errorf("target user not found")
	}

	query := `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`
	result, err := pool.Exec(ctx, query, followerID, targetID)
	if err != nil {
		return fmt.Errorf("failed to unfollow user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return errors.New("not following this user")
	}

	return nil
}

func RemoveFollower(ctx context.Context, pool *pgxpool.Pool, currentUserID int64, followerUsername string) error {
	if pool == nil {
		return errors.New("database connection pool not initialized")
	}

	var followerID int64
	err := pool.QueryRow(ctx, "SELECT id FROM users WHERE username = $1", followerUsername).Scan(&followerID)
	if err != nil {
		return fmt.Errorf("follower user not found")
	}

	query := `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`
	result, err := pool.Exec(ctx, query, followerID, currentUserID)
	if err != nil {
		return fmt.Errorf("failed to remove follower: %w", err)
	}

	if result.RowsAffected() == 0 {
		return errors.New("user is not in your followers list")
	}

	return nil
}

func GetFollowers(ctx context.Context, pool *pgxpool.Pool, username string) ([]UserSummary, error) {
	if pool == nil {
		return nil, errors.New("database connection pool not initialized")
	}

	query := `
		SELECT u.id, u.username, u.email, u.created_at
		FROM follows f
		JOIN users u ON f.follower_id = u.id
		WHERE f.following_id = (SELECT id FROM users WHERE username = $1)
		ORDER BY f.created_at DESC
	`

	rows, err := pool.Query(ctx, query, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get followers: %w", err)
	}
	defer rows.Close()

	var followers []UserSummary
	for rows.Next() {
		var u UserSummary
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan follower row: %w", err)
		}
		followers = append(followers, u)
	}

	if followers == nil {
		followers = []UserSummary{}
	}

	return followers, nil
}

func GetFollowing(ctx context.Context, pool *pgxpool.Pool, username string) ([]UserSummary, error) {
	if pool == nil {
		return nil, errors.New("database connection pool not initialized")
	}

	query := `
		SELECT u.id, u.username, u.email, u.created_at
		FROM follows f
		JOIN users u ON f.following_id = u.id
		WHERE f.follower_id = (SELECT id FROM users WHERE username = $1)
		ORDER BY f.created_at DESC
	`

	rows, err := pool.Query(ctx, query, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get following: %w", err)
	}
	defer rows.Close()

	var following []UserSummary
	for rows.Next() {
		var u UserSummary
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan following row: %w", err)
		}
		following = append(following, u)
	}

	if following == nil {
		following = []UserSummary{}
	}

	return following, nil
}

func GetCounts(ctx context.Context, pool *pgxpool.Pool, username string) (*FollowStats, error) {
	if pool == nil {
		return nil, errors.New("database connection pool not initialized")
	}

	query := `
		SELECT 
			(SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
			(SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count
		FROM users u
		WHERE u.username = $1
	`

	var stats FollowStats
	err := pool.QueryRow(ctx, query, username).Scan(&stats.FollowersCount, &stats.FollowingCount)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	return &stats, nil
}
