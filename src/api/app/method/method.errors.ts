import { Method } from './method.types'

export class MethodError extends Error {}

export class HandlerAlreadyAttached extends MethodError {

    public name = 'HandlerAlreadyAttached'
    public message = 'К данному методу уже прикреплён обработчик'

    public constructor(
        public method: Method
    ) {

        super()
    }

}

export class MethodNotAvailable extends MethodError {

    public name = 'MethodNotAvailable'
    public message = 'Вызываемый метод по какой-либо причине недоступен'

    public constructor(
        public method: Method
    ) {
        super()
    }

}

export class MethodUsedError extends MethodError {

    public name = 'MethodUsedError'
    public message = 'Попытка удалить метод, к которому привязаны важные ресурсы'

}

export class EntityManagerWithoutTransaction extends MethodError {

    public name = 'EntityManagerWithoutTransaction'
    public message = 'Менеджер сущности не содержит обязательную транзакцию'

}