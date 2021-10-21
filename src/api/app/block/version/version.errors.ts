export class BlockVersionError extends Error {}

export class BlockVersionInUse extends BlockVersionError {

    public name = 'BlockVersionInUse'
    public message = 'Попытка удалить версию блока, к которой привязаны важные ресурсы'

}

export class BlockVersionAlreadyExists extends BlockVersionError {

    public name = 'BlockVersionAlreadyExists'
    public message = 'Попытка создать уже существующую версию блока'

}