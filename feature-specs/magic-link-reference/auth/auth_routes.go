package auth

import (
	"time"

	"cloud.google.com/go/storage"
	"github.com/Renrensan/creaty-be/internal/middleware"
	"github.com/Renrensan/creaty-be/internal/module/user"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func RegisterAuthRoutes(router *gin.RouterGroup, db *gorm.DB, rdb *redis.Client, gcs *storage.BucketHandle) {

	// rltb := middleware.NewRateLimiterTokenBucket(10, 5, 10) //size of token, time for refill in second, size of refill token
	// rlfw := middleware.NewRateLimiterFixedWindow(5, 300*time.Second)

	userRepository := user.NewUserRepositoryWithGCSBucketAndRedisClient(db, gcs, rdb)
	authRepository := NewAuthRepository(db, rdb)
	authService := NewAuthService(authRepository, userRepository)
	authHandler := NewAuthController(authService)
	authRouter := router.Group("/auth")

	//Routing starts here
	authRouter.POST("/email-verify", authHandler.VerifyEmail)

	authRouter.GET("/is-user-authorized", middleware.AuthAccessTokenUser(), authHandler.IsUserAuthorized)
	authRouter.GET("/is-hunter-authorized", middleware.AuthAccessTokenHunter(), authHandler.IsHunterAuthorized)

	//Email login functionality routes
	emailLoginRouter := authRouter.Group("/email-login")
	emailLoginRouter.POST("", authHandler.EmaiLoginAttempt)
	emailLoginRouter.GET("/verify", authHandler.EmailLoginVerify)
	emailLoginRouter.GET("/am-i-verified", authHandler.EmailLoginAmIVerified)
	emailLoginRouter.DELETE("/cancel", authHandler.EmailLoginSessionCancel)

	authRouter.GET("/session-data", middleware.AuthAccessTokenUser(), authHandler.GetUserSessionData)

	authRouter.POST("/logout", middleware.AuthRefreshTokenUser(), authHandler.Logout)

	// // Register email only
	authRouter.POST("/register-email", authHandler.RegisterByEmail)
	authRouter.POST("/check-email-verification", authHandler.CheckRegisterEmailVerification)

	//Rate limit resend verification to once every 60 seconds
	rlfwResendVerification := middleware.NewRateLimiterFixedWindow(1, 60*time.Second)
	authRouter.POST("/resend-verification", middleware.RateLimiterFixedWindowMiddleware(rlfwResendVerification, "resend-verification"), authHandler.ResendVerificationEmail)
	authRouter.GET("/resend-verification-cooldown", middleware.GetRateLimiterFixedWindowRemainingCooldownMiddleware(rlfwResendVerification, "resend-verification"), authHandler.GetResendVerificationEmailRemainingCooldown)

	authRouter.POST("/token-refresh", middleware.AuthRefreshTokenUser(), authHandler.TokenRefresh)
}
