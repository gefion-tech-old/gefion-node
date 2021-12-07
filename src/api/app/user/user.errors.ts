export class UserError extends Error {}

export class UserDoesNotExists extends UserError {

    public name = 'UserDoesNotExists'
    public message = 'Указанного пользователя не существует'

}