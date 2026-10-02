package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/Renrensan/creaty-be/configs"
	"github.com/Renrensan/creaty-be/internal/common/db/model"
	"github.com/Renrensan/creaty-be/internal/common/types"
	"github.com/Renrensan/creaty-be/internal/common/utils"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type AuthRepository struct {
	db  *gorm.DB
	rdb *redis.Client
}

type IAuthRepository interface {
	CreateRefreshTokenSessionInRedis(userId uint, emailLoginToken string, refreshToken string, accessToken string) error

	EmailLoginIsUserVerified(userId uint, token string) (types.UserSessionInfoCache, error)
	EmailLoginVerifyToken(userId uint, token string) error

	GetUserByIdentifier(loginDto LoginDto) (model.User, error)
	GetCachedUserSessionDataFromRedis(userId uint) (types.UserSessionInfoCache, error)

	IsRefreshTokenValid(refreshToken string, sub uint) error

	RemoveEmailLoginVerifySessionToken(userId uint, token string) error
	RemoveRefreshToken(refreshToken string, sub uint) error

	StoreEmailLoginVerificationSessionToRedis(userId uint, token string) error

	UpdateRefreshTokenSessionInRedis(oldRefreshToken string, newRefreshToken string, sub uint) error
}

// Initialize Auth Repository Instance
func NewAuthRepository(db *gorm.DB, rdb *redis.Client) IAuthRepository {
	return &AuthRepository{db, rdb}
}

func (authRepository AuthRepository) CreateRefreshTokenSessionInRedis(
	userId uint,
	emailLoginToken string,
	refreshToken string,
	accessToken string,
) error {
	ctx := context.Background()

	emailLoginSessionKey := fmt.Sprintf("login_attempt_%v:%v", userId, emailLoginToken)
	rtSessionKey := fmt.Sprintf("rt_%v:%v", userId, refreshToken)

	userSessionStringMap := map[string]interface{}{
		"loggedInAt":  time.Now(),
		"parentToken": "",
	}

	//Create rt session and delete email login session
	err := authRepository.rdb.Watch(ctx, func(tx *redis.Tx) error {
		//Create rt session
		err := authRepository.rdb.HSet(ctx, rtSessionKey, userSessionStringMap).Err()
		if err != nil {
			return utils.NewUnknownInternalServerError(err)
		}
		//Set expire to 30 days
		err = authRepository.rdb.ExpireAt(ctx, rtSessionKey, time.Now().Add(time.Hour*24*30)).Err()
		if err != nil {
			return utils.NewUnknownInternalServerError(err)
		}

		//Remove email login session
		err = authRepository.rdb.Del(ctx, emailLoginSessionKey).Err()
		if err != nil {
			return utils.NewUnknownInternalServerError(err)
		}
		return nil
	})
	if err != nil {
		return err
	}

	return nil
}

func (authRepository AuthRepository) EmailLoginIsUserVerified(userId uint, token string) (types.UserSessionInfoCache, error) {
	ctx := context.Background()

	key := fmt.Sprintf("login_attempt_%v:%v", userId, token)

	res, err := authRepository.rdb.Get(ctx, key).Result()
	if err != nil {
		if err.Error() == "redis: nil" {
			return types.UserSessionInfoCache{}, utils.NewHttpResponse(404, "Verif attempt not found", nil)
		}
		return types.UserSessionInfoCache{}, utils.NewUnknownInternalServerError(err)
	}

	//If user not yet verified throw forbidden error
	if res == EmailLoginUnverified {
		return types.UserSessionInfoCache{}, utils.NewHttpResponse(403, "Verification Incomplete", nil)
	}

	//If verified return user session cache and remove email login attempt session
	if res == EmailLoginVerified {
		userSession, err := authRepository.GetCachedUserSessionDataAndRolesFromRedis(userId)
		if err != nil {
			return types.UserSessionInfoCache{}, err
		}

		return userSession, nil
	}

	// Else wrong value in login attempt redis session
	return types.UserSessionInfoCache{}, utils.NewHttpResponse(500, "Unknown login attempt session value", res)

}

func (authRepository AuthRepository) EmailLoginVerifyToken(userId uint, token string) error {
	// Construct the Redis key using the token
	key := fmt.Sprintf("login_attempt_%v:%v", userId, token)
	ctx := context.Background()

	// Check if the user is already verified
	_, err := authRepository.EmailLoginIsUserVerified(userId, token)
	if err == nil {
		// If no error, the user is already verified
		return utils.NewHttpResponse(403, "Already Verified", nil)
	}

	// Check for other errors (expecting a 403 if not verified yet)
	if httpErr, ok := err.(utils.HttpResponse); ok && httpErr.StatusCode != 403 {
		return err
	}

	// Set verified status in Redis (15-minute expiration)
	_, err = authRepository.rdb.Set(ctx, key, EmailLoginVerified, time.Minute*15).Result()
	if err != nil {
		return utils.NewUnknownInternalServerError(err)
	}

	return nil
}

func (authRepository *AuthRepository) GetCachedUserSessionDataFromRedis(userId uint) (types.UserSessionInfoCache, error) {
	ctx := context.Background()

	key := fmt.Sprintf("session_data:%v", userId)

	userSession, err := authRepository.rdb.HMGet(ctx, key,
		"username",
		"email",
		"profileImageName",
		"roles").
		Result()

	if err != nil {
		return types.UserSessionInfoCache{}, utils.NewUnknownInternalServerError(err)
	}
	//If not found
	allNil := true
	for _, session := range userSession {
		if session != nil {
			allNil = false
			break
		}
	}
	if allNil {
		return types.UserSessionInfoCache{}, utils.NewHttpResponse(404, "No Session Data Found", nil)
	}

	var profileImgNameCacheResultPointer *string
	if userSession[2] != nil {
		profileImgNameCacheString := userSession[2].(string)
		profileImgNameCacheResultPointer = &profileImgNameCacheString
	}

	// Parse roles from stringified JSON array
	var roles []model.UserRole
	if userSession[3] != nil {
		if err := json.Unmarshal([]byte(userSession[3].(string)), &roles); err != nil {
			return types.UserSessionInfoCache{}, utils.NewUnknownInternalServerError(err)
		}
	}

	return types.UserSessionInfoCache{
		ID:               userId,
		Username:         userSession[0].(string),
		Email:            userSession[1].(string),
		ProfileImageName: profileImgNameCacheResultPointer,
		Roles:            roles,
	}, nil

}

func (authRepository *AuthRepository) GetCachedUserSessionDataAndRolesFromRedis(userId uint) (types.UserSessionInfoCache, error) {
	ctx := context.Background()

	key := fmt.Sprintf("session_data:%v", userId)

	userSession, err := authRepository.rdb.HMGet(ctx, key, "username", "email", "profileImageName", "roles").Result()
	if err != nil {
		return types.UserSessionInfoCache{}, utils.NewUnknownInternalServerError(err)
	}
	//If not found
	allNil := true
	for _, session := range userSession {
		if session != nil {
			allNil = false
			break
		}
	}
	if allNil {
		return types.UserSessionInfoCache{}, utils.NewHttpResponse(404, "No Session Data Found", nil)
	}

	// Parse image
	var profileImgNameCacheResultPointer *string
	if userSession[2] != nil {
		profileImgNameCacheString := userSession[2].(string)
		profileImgNameCacheResultPointer = &profileImgNameCacheString
	}

	// Parse roles from stringified JSON array
	var roles []model.UserRole
	if userSession[3] != nil {
		if err := json.Unmarshal([]byte(userSession[3].(string)), &roles); err != nil {
			return types.UserSessionInfoCache{}, utils.NewUnknownInternalServerError(err)
		}
	}

	return types.UserSessionInfoCache{
		ID:               userId,
		Username:         userSession[0].(string),
		Email:            userSession[1].(string),
		ProfileImageName: profileImgNameCacheResultPointer,
		Roles:            roles,
	}, nil

}

func (authRepository *AuthRepository) GetUserByIdentifier(loginDto LoginDto) (model.User, error) {
	var user model.User

	err := authRepository.db.Model(&user).Preload("ProfilePicture").Where("username=? OR email=?", loginDto.Identifier, loginDto.Identifier).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.User{}, utils.NewHttpResponse(404, "User doesn't exists", nil)
		} else {
			return model.User{}, utils.NewBasicDatabaseErrorHttpResponse(err)
		}
	}

	return user, nil
}

func (authRepository *AuthRepository) RemoveEmailLoginVerifySessionToken(userId uint, token string) error {
	key := fmt.Sprintf("login_attempt_%v:%v", userId, token)
	ctx := context.Background()

	res, err := authRepository.rdb.Del(ctx, key).Result()
	if err != nil {
		return utils.NewUnknownInternalServerError(err)
	}
	if res <= 0 {
		return utils.NewHttpResponse(404, "Session not found", nil)
	}

	return nil
}

func (authRepository *AuthRepository) RemoveRefreshToken(refreshToken string, sub uint) error {
	ctx := context.Background()

	rtKey := fmt.Sprintf("rt_%v:%v", sub, refreshToken)

	// Delete rt
	_, err := authRepository.rdb.Del(ctx, rtKey).Result()
	if err != nil {
		return utils.NewUnknownInternalServerError(err)
	}

	return nil
}

func (authRepository *AuthRepository) StoreEmailLoginVerificationSessionToRedis(userId uint, token string) error {
	ctx := context.Background()

	key := fmt.Sprintf("login_attempt_%v:%v", userId, token)

	//Set unverified email login unverified to redis
	err := authRepository.rdb.Set(ctx, key, EmailLoginUnverified, time.Minute*15).Err()
	if err != nil {
		return utils.NewUnknownInternalServerError(err)
	}
	return nil
}

func (authRepository *AuthRepository) UpdateRefreshTokenSessionInRedis(oldRefreshToken string, newRefreshToken string, sub uint) error {
	ctx := context.Background()

	oldRtKey := fmt.Sprintf("rt_%v:%v", sub, oldRefreshToken)
	newRtKey := fmt.Sprintf("rt_%v:%v", sub, newRefreshToken)

	// Start a Redis transaction
	err := authRepository.rdb.Watch(ctx, func(tx *redis.Tx) error {
		_, err := tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			// Create new refresh token session
			userSessionStringMap := map[string]interface{}{
				"loggedInAt":  time.Now(),
				"parentToken": oldRefreshToken,
			}
			err := authRepository.rdb.HSet(ctx, newRtKey, userSessionStringMap).Err()
			if err != nil {
				return utils.NewUnknownInternalServerError(err)
			}
			// Set expiry for new refresh token
			err = pipe.ExpireAt(ctx, newRtKey, time.Now().Add(time.Hour*24*30)).Err()
			if err != nil {
				return err
			}

			// Turn the old rt to grace period
			var gracePeriodDurationInSeconds int = 10
			envGracePeriodDurationInSeconds, err := strconv.Atoi(configs.GlobalConfig.RefreshTokenGracePeriodDuration)
			if err == nil {
				gracePeriodDurationInSeconds = envGracePeriodDurationInSeconds
			}
			err = pipe.Expire(ctx, oldRtKey, time.Duration(gracePeriodDurationInSeconds)*time.Second).Err()
			if err != nil {
				return err
			}

			return nil
		})
		return err
	}, oldRtKey)

	if err != nil {
		return err
	}

	return nil
}

func (authRepository *AuthRepository) IsRefreshTokenValid(refreshToken string, sub uint) error {
	rtKey := fmt.Sprintf("rt_%v:%v", sub, refreshToken)

	ctx := context.Background()
	res, err := authRepository.rdb.Exists(ctx, rtKey).Result()
	if err != nil {
		return utils.NewUnknownInternalServerError(err)
	}

	// If not found refresh token invalid
	if res == 0 {
		return utils.NewHttpResponse(401, "Unauthorized", nil)
	}

	return nil
}
