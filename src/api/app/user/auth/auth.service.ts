import { injectable, inject } from 'inversify'
import { IAuthService } from './auth.interface'
import { IRemoteAuthService } from './remote-auth/remote-auth.interface'
import { USER_SYMBOL } from '../user.types'
import { 
    AuthConfig, 
    RefreshToken, 
    UserAgent, 
    IPAddress, 
    Tokens, 
    AuthVerifyPayload,
    AuthCode,
    AccessToken
} from './auth.types'
import jwt from 'jsonwebtoken'

@injectable()
export class AuthService implements IAuthService {

    public constructor(
        @inject(USER_SYMBOL.RemoteAuthService)
        private remoteAuthService: IRemoteAuthService,

        @inject(USER_SYMBOL.AuthConfig)
        private authConfig: Promise<AuthConfig>
    ) {}

    private async getAccessToken(payload: AuthVerifyPayload, secret: string, expires: Date): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
            jwt.sign(payload, secret, {
                expiresIn: Math.ceil((expires.getTime() - Date.now()) / 1000)
            }, function(err, token) {
                if (err || !token) {
                    reject(err)
                    return
                }

                resolve(token)
                return
            })
        })
    }

    public async refreshToken(refreshToken: RefreshToken, ua: UserAgent, ip: IPAddress): Promise<Tokens | undefined> {
        const authConfig = await this.authConfig
        const tokens = await this.remoteAuthService.refreshToken(refreshToken, ua, ip)

        if (!tokens) {
            return
        }

        const accessToken = await this.getAccessToken(
            tokens.authVerifyPayload, authConfig.secret, tokens.accessTokenExpires
        )

        return {
            refreshToken: tokens.refreshToken,
            refreshTokenExpires: tokens.refreshTokenExpires,
            authVerifyPayload: tokens.authVerifyPayload,
            accessTokenExpires: tokens.accessTokenExpires,
            accessToken: accessToken
        }
    }

    public async login(code: AuthCode): Promise<Tokens | undefined> {
        const authConfig = await this.authConfig
        const tokens = await this.remoteAuthService.login(code)

        if (!tokens) {
            return
        }

        const accessToken = await this.getAccessToken(
            tokens.authVerifyPayload, authConfig.secret, tokens.accessTokenExpires
        )

        return {
            refreshToken: tokens.refreshToken,
            refreshTokenExpires: tokens.refreshTokenExpires,
            authVerifyPayload: tokens.authVerifyPayload,
            accessTokenExpires: tokens.accessTokenExpires,
            accessToken: accessToken
        }
    }

    public async verify(accessToken: AccessToken): Promise<AuthVerifyPayload | undefined> {
        const authConfig = await this.authConfig
        return await new Promise<AuthVerifyPayload | undefined>((resolve, reject) => {
            jwt.verify(accessToken, authConfig.secret, function(err, payload) {
                if (err) {
                    if ([jwt.JsonWebTokenError, jwt.NotBeforeError, jwt.TokenExpiredError].map(errorClass => {
                        return err instanceof errorClass
                    }).includes(true)) {
                        resolve(undefined)
                        return
                    } else {
                        reject(err)
                        return
                    }
                }

                resolve(payload as AuthVerifyPayload)
                return
            })
        })
    }

}