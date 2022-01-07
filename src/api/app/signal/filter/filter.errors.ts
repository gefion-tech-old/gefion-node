export class FilterError extends Error {}

export class FilterAlreadyExists extends FilterError {

    public name = 'FilterAlreadyExists'
    public message = 'Указанный фильтр уже существует'

}

export class FilterDoesNotExists extends FilterError {

    public name = 'FilterDoesNotExists'
    public message = 'Указанного фильтра не существует'

}

export class FilterMethodNotDefined extends FilterError {

    public name = 'FilterMethodNotDefined'
    public message = 'К фильтру нельзя привязать несуществующий метод'

}