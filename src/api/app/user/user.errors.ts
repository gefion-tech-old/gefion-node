export class UserError extends Error {}

export class UserAlreadyExists extends UserError {

    public name = 'UserAlreadyExists'
    public message = 'Указанный пользователь уже существует'

}

export class UserDoesNotExists extends UserError {

    public name = 'UserDoesNotExists'
    public message = 'Указанного пользователя не существует'

}