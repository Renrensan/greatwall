package auth

import (
	"github.com/Renrensan/creaty-be/internal/common/jwtservice"
	"github.com/Renrensan/creaty-be/internal/common/types"
	"github.com/Renrensan/creaty-be/internal/common/utils"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type AuthController struct {
	authService IAuthService
}

// Initialize Auth Controller Instance
func NewAuthController(authService IAuthService) *AuthController {
	return &AuthController{authService}
}

func (authController AuthController) EmailLoginAmIVerified(ctx *gin.Context) {
	emailLoginToken := ctx.Query("token")
	if emailLoginToken == "" {
		ctx.Error(utils.NewHttpResponse(400, "No token provided", nil))
		return
	}

	loginResponse, err := authController.authService.EmailLoginAmIVerified(emailLoginToken)
	if err != nil {
		ctx.Error(err)
		return
	}

	response := utils.NewHttpResponse(200, "Success Login", loginResponse)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) EmaiLoginAttempt(ctx *gin.Context) {
	type EmailLoginDto struct {
		Email string `json:"email" xml:"email" form:"email" validate:"required,email"`
	}

	emailLoginDto := &EmailLoginDto{}

	err := ctx.ShouldBindJSON(&emailLoginDto)
	if err != nil {
		ctx.Error(err)
		return
	}

	validate := validator.New()
	err = validate.Struct(emailLoginDto)
	if err != nil {
		ctx.Error(utils.NewFormErrorResponse(err))
		return
	}

	emailLoginResponse, err := authController.authService.EmailLoginAttempt(emailLoginDto.Email)
	if err != nil {
		ctx.Error(err)
		return
	}

	response := utils.NewHttpResponse(200, "Success Email Login Init", emailLoginResponse)
	ctx.JSON(200, response)
}

func (authController *AuthController) EmailLoginSessionCancel(ctx *gin.Context) {
	emailLoginToken := ctx.Query("token")
	if emailLoginToken == "" {
		ctx.Error(utils.NewHttpResponse(401, "No Token provided", nil))
		return
	}

	err := authController.authService.EmailLoginSessionCancel(emailLoginToken)
	if err != nil {
		ctx.Error(utils.NewHttpResponse(401, "Invalid Token", nil))
		return
	}

	response := utils.NewHttpResponse(201, "Success Cancel Email Login Session", nil)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) EmailLoginVerify(ctx *gin.Context) {
	emailLoginToken := ctx.Query("token")
	if emailLoginToken == "" {
		ctx.Error(utils.NewHttpResponse(401, "No Token provided", nil))
		return
	}

	err := authController.authService.EmailLoginVerify(emailLoginToken)
	if err != nil {
		ctx.Error(err)
		return
	}

	response := utils.NewHttpResponse(200, "Success Verifying Email", nil)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) GetResendVerificationEmailRemainingCooldown(ctx *gin.Context) {
	response := utils.NewHttpResponse(200, "Success", types.ApiCooldown{
		RetryAfterSeconds: 0,
	})
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) IsUserAuthorized(ctx *gin.Context) {
	response := utils.NewHttpResponse(200, "Authorized", nil)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) IsHunterAuthorized(ctx *gin.Context) {
	response := utils.NewHttpResponse(200, "Authorized", nil)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) RegisterByEmail(ctx *gin.Context) {
	newUserEmail := &RegisterEmailDto{}

	// Bind request
	err := ctx.ShouldBindJSON(&newUserEmail)
	if err != nil {
		ctx.Error(utils.NewFormErrorResponse(err))
		return
	}

	validate := validator.New()
	err = validate.Struct(newUserEmail)
	if err != nil {
		ctx.Error(utils.NewFormErrorResponse(err))
		return
	}

	// Send Request to auth_service
	err = authController.authService.RegisterByEmail(newUserEmail.Email)
	if err != nil {
		ctx.Error(err)
		return
	}

	// Send Response
	response := utils.NewHttpResponse(201, "Success send email", nil)
	ctx.JSON(response.StatusCode, response)
}

// Check email verification
func (authController *AuthController) CheckRegisterEmailVerification(ctx *gin.Context) {
	newUserEmail := &RegisterEmailDto{}

	// Bind request
	err := ctx.Bind(&newUserEmail)
	if err != nil {
		ctx.Error(utils.NewFormErrorResponse(err))
		return
	}

	// Check if email already verified
	err = authController.authService.CheckRegisterEmailVerification(newUserEmail.Email)
	if err != nil {
		ctx.Error(err)
		return
	}

	// Send Response
	response := utils.NewHttpResponse(200, "Email Verified", nil)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) GetUserSessionData(ctx *gin.Context) {
	claims, _ := jwtservice.GetAccessTokenClaims(ctx)

	userSession, err := authController.authService.GetUserSessionDataByAccessTokenParams(claims)
	if err != nil {
		ctx.Error(err)
		return
	}
	response := utils.NewHttpResponse(200, "Success Get User Session", userSession)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) Logout(ctx *gin.Context) {
	refreshToken := ctx.Value("refresh_token").(string)
	sub := uint(ctx.Value("refresh_token_sub").(float64))

	err := authController.authService.Logout(refreshToken, sub)
	if err != nil {
		ctx.Error(err)
		return
	}

	response := utils.NewHttpResponse(200, "Success Logout", nil)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) ResendVerificationEmail(ctx *gin.Context) {
	type ResendVerificaitonEmailDto struct {
		Email *string
	}
	emailRequest := &ResendVerificaitonEmailDto{}
	err := ctx.ShouldBindJSON(emailRequest)
	if err != nil {
		ctx.Error(utils.NewFormErrorResponse(err))
		return
	}

	err = authController.authService.ResendVerificationEmail(*emailRequest.Email)
	if err != nil {
		ctx.Error(err)
		return
	}

	response := utils.NewHttpResponse(200, "Success Resend Verification Email", nil)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) TokenRefresh(ctx *gin.Context) {
	refreshToken := ctx.Value("refresh_token").(string)
	sub := uint(ctx.Value("refresh_token_sub").(float64))

	refreshTokenResponse, err := authController.authService.TokenRefresh(refreshToken, sub)
	if err != nil {
		ctx.Error(err)
		return
	}

	response := utils.NewHttpResponse(200, "Success Refresh Token", refreshTokenResponse)
	ctx.JSON(response.StatusCode, response)
}

func (authController *AuthController) VerifyEmail(ctx *gin.Context) {
	type VerifyEmailBody struct {
		Token *string
	}
	verifyEmailReq := &VerifyEmailBody{}
	err := ctx.ShouldBindJSON(&verifyEmailReq)
	if err != nil {
		ctx.Error(utils.NewFormErrorResponse(err))
		return
	}

	err = authController.authService.VerifyEmail(*verifyEmailReq.Token)
	if err != nil {
		ctx.Error(err)
		return
	}

	response := utils.NewHttpResponse(200, "Success Verify Email", nil)
	ctx.JSON(response.StatusCode, response)
}
