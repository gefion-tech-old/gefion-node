export class TypeormError extends Error {}

export class EntityManagerWithoutTransaction extends TypeormError {

    public name = 'EntityManagerWithoutTransaction'
    public message = 'Менеджер сущности не содержит обязательную транзакцию'

}

export class InvalidTransactionObject extends TypeormError {

    public name = 'InvalidTransactionObject'
    public message = 'Некорректный объект транзакции'

}