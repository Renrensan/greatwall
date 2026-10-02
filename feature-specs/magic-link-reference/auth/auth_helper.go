package auth

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Renrensan/creaty-be/configs"
	"github.com/Renrensan/creaty-be/internal/common/jwtservice"
	"github.com/Renrensan/creaty-be/internal/common/utils"
	"github.com/golang-jwt/jwt/v5"
)

func encryptEmailToken(emailToken string) (string, error) {
	key := []byte(configs.GlobalConfig.EmailLoginEncryptKey)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", utils.NewUnknownInternalServerError(err)
	}

	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", utils.NewUnknownInternalServerError(err)
	}

	cfb := cipher.NewCFBEncrypter(block, iv)
	cipherText := make([]byte, len(emailToken))
	cfb.XORKeyStream(cipherText, []byte(emailToken))

	return url.QueryEscape(base64.StdEncoding.EncodeToString(append(iv, cipherText...))), nil
}

func decryptUrlEscapedEncryptedEmailToken(encryptedEmailToken string) (string, error) {
	encryptedEmailToken, err := url.QueryUnescape(encryptedEmailToken)
	if err != nil {
		return "", utils.NewUnknownInternalServerError(err)
	}
	// Convert all spaces to +
	encryptedEmailToken = strings.ReplaceAll(encryptedEmailToken, " ", "+")

	key := []byte(configs.GlobalConfig.EmailLoginEncryptKey)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", utils.NewUnknownInternalServerError(err)

	}

	cipherText, err := base64.StdEncoding.DecodeString(encryptedEmailToken)
	if err != nil {
		fmt.Println(err, encryptedEmailToken)
		return "", utils.NewHttpResponse(404, "Verif attempt not found", nil)
	}

	if len(cipherText) < aes.BlockSize {
		fmt.Println(err, encryptedEmailToken)
		return "", utils.NewHttpResponse(404, "Verif attempt not found", nil)
	}

	iv, cipherText := cipherText[:aes.BlockSize], cipherText[aes.BlockSize:]
	cfb := cipher.NewCFBDecrypter(block, iv)
	plainText := make([]byte, len(cipherText))
	cfb.XORKeyStream(plainText, cipherText)

	return string(plainText), nil
}

func generateEmailLoginToken(userId uint) (string, error) {
	// Convert userId and timestamp to strings (dynamic length)
	userIDStr := fmt.Sprintf("%d", userId)
	timestamp := time.Now().Unix()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// Generate 8 bytes of random data for uniqueness
	randomBytes := make([]byte, 8)
	_, err := rand.Read(randomBytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Combine inputs into a single string for hashing
	input := fmt.Sprintf("%s:%s:%x", userIDStr, timestampStr, randomBytes)

	// Hash the combined input
	hash := sha256.Sum256([]byte(input))
	hashBytes := hash[:16] // Take first 16 bytes for compactness

	// Combine original data with hash for decoding
	// Use a separator to distinguish parts
	payload := fmt.Sprintf("%s:%s:%x", userIDStr, timestampStr, hashBytes)
	token := base64.URLEncoding.EncodeToString([]byte(payload))

	// Remove padding
	return strings.TrimRight(token, "="), nil
}

func decodeEmailLoginToken(token string) (EmailTokenData, error) {
	// Add padding if necessary
	if len(token)%4 != 0 {
		token += strings.Repeat("=", 4-len(token)%4)
	}

	decodedBytes, err := base64.URLEncoding.DecodeString(token)
	if err != nil {
		return EmailTokenData{}, err
	}

	// Split by separator
	parts := bytes.Split(decodedBytes, []byte(":"))
	if len(parts) != 3 {
		return EmailTokenData{}, fmt.Errorf("invalid token format: expected 3 parts")
	}

	// Extract userID (first part)
	userID, err := strconv.ParseUint(string(parts[0]), 10, 64)
	if err != nil {
		return EmailTokenData{}, fmt.Errorf("invalid userID: %w", err)
	}

	return EmailTokenData{
		UserID: uint(userID),
	}, nil
}

// Generate new access token
func generateAccessToken(params AccessTokenParams) (string, error) {
	claims := jwt.MapClaims{}

	claims["sub"] = params.UserId

	// Serialize roles to array of maps
	var rolesClaim []map[string]interface{}
	for _, role := range params.Roles {
		rolesClaim = append(rolesClaim, map[string]interface{}{
			"name": role.Name,
		})
	}
	claims["roles"] = rolesClaim

	expireInSeconds := 60
	if envExpire, err := strconv.Atoi(configs.GlobalConfig.AccessTokenExpireInSeconds); err == nil {
		expireInSeconds = envExpire
	}
	claims["exp"] = time.Now().Add(time.Second * time.Duration(expireInSeconds)).Unix()

	return jwtservice.GenerateHMACSha256SignedJwtToken(configs.GlobalConfig.AccessTokenSecret, claims)
}

// Generate new refresh token
func generateRefreshToken(userId uint) (string, error) {
	claims := jwt.MapClaims{}
	claims["sub"] = userId
	claims["exp"] = time.Now().Add(time.Hour * 24 * 30).Unix()

	return jwtservice.GenerateHMACSha256SignedJwtToken(configs.GlobalConfig.RefreshTokenSecret, claims)
}
