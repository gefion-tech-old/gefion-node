export class GuardError extends Error {}

export class GuardAlreadyExists extends GuardError {

    public name = 'GuardAlreadyExists'
    public message = 'Указанный охранник уже существует'

}

export class GuardDoesNotExists extends GuardError {

    public name = 'GuardDoesNotExists'
    public message = 'Указанного охранника не существует'

}

export class GuardMethodNotDefined extends GuardError {

    public name = 'GuardMethodNotDefined'
    public message = 'К охраннику нельзя привязать несуществующий метод'

}