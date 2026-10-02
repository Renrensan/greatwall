package auth

import (
	"fmt"
	"os"
	"time"

	"github.com/Renrensan/creaty-be/configs"
	"github.com/Renrensan/creaty-be/internal/common/jwtservice"
	"github.com/Renrensan/creaty-be/internal/common/types"
	"github.com/Renrensan/creaty-be/internal/common/utils"
	"github.com/Renrensan/creaty-be/internal/module/mailer"
	"github.com/Renrensan/creaty-be/internal/module/user"
	"github.com/golang-jwt/jwt/v5"
)

type IAuthService interface {
	CheckRegisterEmailVerification(email string) error

	EmailLoginAmIVerified(token string) (LoginResponseDto, error)
	EmailLoginAttempt(email string) (EmailLoginResponse, error)
	EmailLoginSessionCancel(token string) error
	EmailLoginVerify(token string) error

	GetUserSessionDataByAccessTokenParams(params types.AccessTokenClaims) (types.UserSessionResponse, error)

	Logout(refresToken string, sub uint) error

	RegisterByEmail(email string) error
	ResendVerificationEmail(email string) error

	TokenRefresh(refreshToken string, sub uint) (RefreshTokenResponse, error)

	VerifyEmail(emailVerificationTokenString string) error
}


type AuthService struct {
	authRepository IAuthRepository
	userRepository user.IUserRepository
}

func NewAuthService(authRepository IAuthRepository, userRepository user.IUserRepository) IAuthService {
	return &AuthService{authRepository, userRepository}
}

func (authService *AuthService) CheckRegisterEmailVerification(email string) error {
	// Initiate user
	user := LoginDto{
		Identifier: email,
		Password:   "",
	}

	// Check if user exist
	userData, err := authService.authRepository.GetUserByIdentifier(user)
	if err != nil {
		if err.(utils.HttpResponse).StatusCode == 404 {
			return utils.NewHttpResponse(404, "User not found", nil)
		}
		return err
	}

	// Check if user already verified
	if userData.VerifyEmailToken != nil {
		return utils.NewHttpResponse(403, "User not verified", nil)
	}

	return nil
}

// Check whether email login verif session is complete or not
func (authService *AuthService) EmailLoginAmIVerified(emailLoginTokenEncrypted string) (LoginResponseDto, error) {
	emailLoginToken, err := decryptUrlEscapedEncryptedEmailToken(emailLoginTokenEncrypted)
	if err != nil {
		return LoginResponseDto{}, err
	}

	// Decode the token to get the userID
	data, err := decodeEmailLoginToken(emailLoginToken)
	if err != nil {
		return LoginResponseDto{}, utils.NewUnknownInternalServerError(err)
	}
	userId := data.UserID

	//Check if already verified
	//Retrieve user data if verified
	user, err := authService.authRepository.EmailLoginIsUserVerified(userId, emailLoginToken)
	if err != nil {
		return LoginResponseDto{}, err
	}

	//Generate access token
	accessToken, err := generateAccessToken(AccessTokenParams{UserId: user.ID, Roles: user.Roles})
	if err != nil {
		return LoginResponseDto{}, utils.NewHttpResponse(500, "Failed to generate access token", err)
	}
	//Generate refresh token
	refreshToken, err := generateRefreshToken(user.ID)
	if err != nil {
		return LoginResponseDto{}, utils.NewHttpResponse(500, "Failed to generate refresh token", err)
	}
	// Store valid refresh token to redis as refresh token session
	err = authService.authRepository.CreateRefreshTokenSessionInRedis(user.ID, emailLoginToken, refreshToken, accessToken)
	if err != nil {
		return LoginResponseDto{}, err
	}

	// Return user session info, access, and refresh token to client
	return LoginResponseDto{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// Attempt to login using email
func (authService *AuthService) EmailLoginAttempt(email string) (EmailLoginResponse, error) {
	//Check user against postgre database, if found extract user data to create session
	user, err := authService.userRepository.FindFirstUserByEmail(email)
	if err != nil {
		//If 404 error modify status to 401
		if err.(utils.HttpResponse).StatusCode == 404 {
			return EmailLoginResponse{}, utils.NewHttpResponse(401, "Invalid Email", nil)
		}
		return EmailLoginResponse{}, err
	}
	//If user email is unverified, throw 403 forbidden error
	if user.VerifyEmailToken != nil {
		return EmailLoginResponse{}, utils.NewHttpResponse(403, "Unverified email attempt to login", email)
	}

	// Generate random email login token
	token, err := generateEmailLoginToken(user.ID)
	if err != nil {
		return EmailLoginResponse{}, utils.NewUnknownInternalServerError(err)
	}

	// User exists and is verified!
	//Store generated email token to redis
	err = authService.authRepository.StoreEmailLoginVerificationSessionToRedis(user.ID, token)
	if err != nil {
		return EmailLoginResponse{}, err
	}

	//Send email for verification
	err = mailer.SendEmailLoginVerificationLink(email, fmt.Sprintf("%v/auth/login-verify-email?id=%v&token=%v", configs.GlobalConfig.FrontendUrl, user.ID, token))
	if err != nil {
		return EmailLoginResponse{}, utils.NewHttpResponse(500, "Error when sending email verification error", err)
	}

	// Create user session info cache from user data
	err = authService.userRepository.CreateUserSessionInfoCache(user)
	if err != nil {
		return EmailLoginResponse{}, err
	}

	// Success, encrypt, return token and id to client for next step process
	encryptedEmailLoginToken, err := encryptEmailToken(token)
	if err != nil {
		return EmailLoginResponse{}, err
	}
	return EmailLoginResponse{Token: encryptedEmailLoginToken}, nil
}

func (authService *AuthService) EmailLoginSessionCancel(token string) error {
	// Decrypt the token first
	token, err := decryptUrlEscapedEncryptedEmailToken(token)
	if err != nil {
		return err
	}

	// Decode the token to get the userID
	data, err := decodeEmailLoginToken(token)
	if err != nil {
		return utils.NewHttpResponse(400, "Invalid token format", nil)
	}
	userId := data.UserID

	err = authService.authRepository.RemoveEmailLoginVerifySessionToken(userId, token)
	if err != nil {
		return err
	}
	return nil
}

// Attempt to complete email login verification session
func (authService *AuthService) EmailLoginVerify(token string) error {
	// Decode the token to get the userID
	data, err := decodeEmailLoginToken(token)
	if err != nil {
		return utils.NewHttpResponse(400, "Invalid token", nil)
	}
	userId := data.UserID

	err = authService.authRepository.EmailLoginVerifyToken(userId, token)
	if err != nil {
		return err
	}

	return nil
}

func (authService *AuthService) GetUserSessionDataByAccessTokenParams(params types.AccessTokenClaims) (types.UserSessionResponse, error) {
	userSession, err := authService.authRepository.GetCachedUserSessionDataFromRedis(uint(params.Sub))
	if err != nil {
		//If not found, recreate user cache
		if err.(utils.HttpResponse).StatusCode == 404 {
			// Find user from postgre
			user, err := authService.userRepository.FindUserById(uint(params.Sub))
			if err != nil {
				return types.UserSessionResponse{}, err
			}
			//Store cache to redis and return user session info
			err = authService.userRepository.CreateUserSessionInfoCache(user)
			if err != nil {
				return types.UserSessionResponse{}, err
			}

			// If profile image exists, generate and return url
			var profileImgUrl *string
			if user.UserProfileImage != nil && user.UserProfileImage.Name != nil {
				// If using gcs, get signed url from repo as it involves redis cache
				if configs.GlobalConfig.StorageEnableService != "false" {
					if url, err := authService.userRepository.GenerateProfileImageSignedURL(*user.UserProfileImage.Name); err == nil {
						profileImgUrl = url
					}
				} else {
					// If not using gcs, generate base url to local env based url
					profileUrl := fmt.Sprintf("%s/%s", configs.GlobalConfig.ProfileImageBaseUrl, *user.UserProfileImage.Name)
					profileImgUrl = &profileUrl
				}

			}

			return types.UserSessionResponse{
				ID:              user.ID,
				Username:        *user.Username,
				Email:           *user.Email,
				ProfileImageUrl: profileImgUrl,
				Roles:           user.Roles,
			}, nil
		}

		//Any other error throw to client
		return types.UserSessionResponse{}, err
	}

	var profileImageUrl *string
	// Generate and check url still valid if using gcs
	if userSession.ProfileImageName != nil {
		if configs.GlobalConfig.StorageEnableService != "false" {
			if url, err := authService.userRepository.GenerateProfileImageSignedURL(*userSession.ProfileImageName); err == nil {
				profileImageUrl = url
			}
		} else {
			// If not using gcs, generate base url to local env based url
			profileUrl := fmt.Sprintf("%s/%s", configs.GlobalConfig.ProfileImageBaseUrl, *userSession.ProfileImageName)
			profileImageUrl = &profileUrl
		}
	}

	return types.UserSessionResponse{
		ID:              userSession.ID,
		Username:        userSession.Username,
		Email:           userSession.Email,
		ProfileImageUrl: profileImageUrl,
		Roles:           userSession.Roles,
	}, nil
}

func (authService *AuthService) Logout(refresToken string, sub uint) error {
	err := authService.authRepository.RemoveRefreshToken(refresToken, sub)
	if err != nil {
		return err
	}
	return nil
}

func (authService *AuthService) RegisterByEmail(email string) error {
	// Create token
	emailVerifToken, err := jwtservice.GenerateHMACSha256SignedJwtToken(os.Getenv("EMAIL_VERIF_JWT_KEY"), jwt.MapClaims{
		"sub": email,
		"exp": jwt.NewNumericDate(time.Now().Add(1 * time.Hour)), //1 Hour expire date
	})
	if err != nil {
		return err
	}

	// Check if user already verified
	user, _ := authService.userRepository.FindUserByEmail(email)
	if user.Email != nil {
		if user.VerifyEmailToken != nil {
			return utils.NewHttpResponse(403, "User not verified", nil)
		}
	}

	// Send User Data to repository
	err = authService.userRepository.CreateUserByEmail(email, emailVerifToken)
	if err != nil {
		if err.(utils.HttpResponse).StatusCode == 409 {
			return utils.NewHttpResponse(409, "User already registered", nil)
		}
		return err
	}

	//Send activation email
	errSendEmail := mailer.SendRegisterEmailVerification(email, fmt.Sprintf("%v/auth/activate-account/%v", configs.GlobalConfig.FrontendUrl, emailVerifToken))
	if errSendEmail != nil {
		return utils.NewHttpResponse(500, "Error when sending email verification error", errSendEmail)
	}

	// If Success
	return nil
}

func (authService *AuthService) ResendVerificationEmail(email string) error {
	//get verify token by email
	user, errUser := authService.userRepository.FindUserByEmail(email)
	if errUser != nil {
		if e, ok := errUser.(utils.HttpResponse); ok {
			return e
		}
		return utils.NewUnknownInternalServerError(errUser)
	}

	if user.VerifyEmailToken == nil {
		return utils.NewHttpResponse(403, "User already verified", nil)
	}

	//Sign email verification token
	emailVerifToken, errEmailVerifyToken := jwtservice.GenerateHMACSha256SignedJwtToken(os.Getenv("EMAIL_VERIF_JWT_KEY"), jwt.MapClaims{
		"sub": user.Email,
		//1 Hour expire date
		"exp": jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
	})
	if errEmailVerifyToken != nil {
		return errEmailVerifyToken
	}

	//update user verification token
	errUpdateToken := authService.userRepository.UpdateUserVerificationToken(user.ID, emailVerifToken)
	if errUpdateToken != nil {
		return errUpdateToken
	}

	// Send email verification email to new user
	errSendEmail := mailer.SendRegisterEmailVerification(email, fmt.Sprintf("%v/auth/activate-account/%v", configs.GlobalConfig.FrontendUrl, emailVerifToken))
	if errSendEmail != nil {
		return utils.NewHttpResponse(500, "Error when sending email verification error", errSendEmail)
	}

	return nil
}

func (authService *AuthService) TokenRefresh(refreshToken string, sub uint) (RefreshTokenResponse, error) {
	//Check if refresh token valid
	err := authService.authRepository.IsRefreshTokenValid(refreshToken, sub)
	if err != nil {
		return RefreshTokenResponse{}, err
	}

	// Construct new correct access token
	var newAccessToken string
	userSessionRoles, err := authService.userRepository.GetUserSessionInfoRolesFromRedisByUserId(sub)
	if err != nil {
		// If not found recreate user session and construct access token from there
		if err.(utils.HttpResponse).StatusCode == 404 {
			userData, err := authService.userRepository.CreateUserSessionInfoGetByUserId(sub)
			if err != nil {
				return RefreshTokenResponse{}, err
			}

			newAccessToken, err =
				generateAccessToken(
					AccessTokenParams{
						UserId: userData.ID,
						Roles:  userData.Roles,
					})
			if err != nil {
				return RefreshTokenResponse{}, err
			}
			//Continue if no error
		} else {
			//Other error throw error
			return RefreshTokenResponse{}, err
		}
	} else {
		newAccessToken, err = generateAccessToken(AccessTokenParams{UserId: sub, Roles: userSessionRoles})
		if err != nil {
			return RefreshTokenResponse{}, err
		}
	}

	//Construct new refresh token
	newRefreshToken, err := generateRefreshToken(sub)
	if err != nil {
		return RefreshTokenResponse{}, err
	}
	// Update refresh token in redis
	err = authService.authRepository.UpdateRefreshTokenSessionInRedis(refreshToken, newRefreshToken, sub)
	if err != nil {
		return RefreshTokenResponse{}, err
	}

	return RefreshTokenResponse{AccessToken: newAccessToken, RefreshToken: newRefreshToken}, nil
}

func (authService *AuthService) VerifyEmail(emailVerificationTokenString string) error {
	//Attempt to parse token first, automatically throw invalid tokens
	tokenPayload, err := jwtservice.ParseHMACSignedJwtToken(emailVerificationTokenString, os.Getenv("EMAIL_VERIF_JWT_KEY"))
	if err != nil {
		return err
	}

	//If token is valid but not in db then it is an already verified token
	_, err = authService.userRepository.FindUserByEmailVerifyToken(emailVerificationTokenString)
	if err != nil {
		if e, ok := err.(utils.HttpResponse); ok {
			if e.StatusCode == 404 {
				return utils.NewHttpResponse(403, "User already verified", nil)
			}
			return e
		}
		return utils.NewUnknownInternalServerError(err)
	}

	//Remove token from db to verify email
	err = authService.userRepository.RemoveEmailVerifTokenByEmail(tokenPayload["sub"].(string))
	if err != nil {
		if e, ok := err.(utils.HttpResponse); ok {
			return e
		}
		return utils.NewUnknownInternalServerError(err)
	}

	return nil
}
