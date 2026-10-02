package auth

import "github.com/Renrensan/creaty-be/internal/common/db/model"

type AccessTokenParams struct {
	UserId uint
	Roles  []model.UserRole
}

type LoginDto struct {
	Identifier string `json:"identifier" xml:"identifier" form:"identifier"`
	Password   string `json:"password" xml:"password" form:"password"`
}

type LoginResponseDto struct {
	AccessToken  string `json:"accessToken" xml:"accessToken" form:"accessToken"`
	RefreshToken string `json:"refreshToken" xml:"refreshToken" form:"refreshToken"`
}

type RefreshTokenResponse struct {
	AccessToken  string `json:"accessToken" xml:"accessToken" form:"accessToken"`
	RefreshToken string `json:"refreshToken" xml:"refreshToken" form:"refreshToken"`
}

type EmailLoginResponse struct {
	Token string `json:"token" xml:"token"  form:"token"`
}

type RegisterEmailDto struct {
	Email string `json:"email" xml:"email" form:"email" validate:"required,email"`
}

const (
	EmailLoginVerified   string = "verified"
	EmailLoginUnverified string = "unverified"
)

type EmailTokenData struct {
	UserID uint
}
