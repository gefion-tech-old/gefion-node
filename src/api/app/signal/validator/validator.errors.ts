export class ValidatorError extends Error {}

export class ValidatorAlreadyExists extends ValidatorError {

    public name = 'ValidatorAlreadyExists'
    public message = 'Указанный валидатор уже существует'

}

export class ValidatorDoesNotExists extends ValidatorError {

    public name = 'ValidatorDoesNotExists'
    public message = 'Указанного валидатора не существует'

}

export class ValidatorMethodNotDefined extends ValidatorError {

    public name = 'ValidatorMethodNotDefined'
    public message = 'К валидатору нельзя привязать несуществующий метод'

}