import { AuthConfig } from '../auth/auth.types'

export function getAuthConfig(config: Partial<AuthConfig>): () => Promise<AuthConfig> {
    return async function() {
        return {
            loginCorrectRedirect: config.loginCorrectRedirect ?? '/',
            loginUncorrectRedirect: config.loginUncorrectRedirect ?? '/',
            logoutRedirect: config.logoutRedirect ?? '/',
            secret: config.secret ?? 'secret'
        }
    }
}