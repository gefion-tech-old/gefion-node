export type RefreshToken = string
export type UserAgent = string
export type IPAddress = string
export type AccessToken = string
export type AuthCode = string

export interface Tokens {
    /**
     * Строка refresh токена
     */
    readonly refreshToken: RefreshToken
    /**
     * Дата истечения refresh токена
     */
    readonly refreshTokenExpires: Date
    /**
     * Строка access токена
     */
    readonly accessToken: AccessToken
    /**
     * Дата истечения access токена
     */
    readonly accessTokenExpires: Date
    /**
     * Полезная нагрузка access токена
     */
    readonly authVerifyPayload: AuthVerifyPayload
}

export interface AuthConfig {
    /**
     * Путь, на который должен производиться редирект после корректного входа в аккаунт
     */
    readonly loginCorrectRedirect: string
    /**
     * Путь, на который должен производиться редирект после неуспешной попытки входа в аккаунт
     */
    readonly loginUncorrectRedirect: string
    /**
     * Путь, на которые должен производиться редирект после выхода из аккаунта
     */
    readonly logoutRedirect: string
    /**
     * Секретный ключ для алгоритмов шифрования и хэширования
     */
    readonly secret: string
}

export interface AuthVerifyPayload {
    /**
     * Имя пользователя, который был авторизован
     */
    readonly username: string
}