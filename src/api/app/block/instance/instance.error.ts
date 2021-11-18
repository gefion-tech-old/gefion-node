import { Version } from '../version/version.types'

export class BlockInstanceError extends Error {}

export class NotExistBlockVersion extends BlockInstanceError {

    public name = 'NotExistBlockVersion'
    public message = 'Указанной версии блока не существует'

    public constructor(
        public version: Version
    ) {
        super()    
    }

}

export class NotExistBlockVersionInstance extends BlockInstanceError {
    
    public name = 'NotExistBlockVersionInstance'
    public message = 'Экземпляра версии блока не существует'

}

export class BlockVersionFolderNotFound extends BlockInstanceError {

    public name = 'BlockVersionFolderNotFound'
    public message = 'Папки указанной версии блока не существует'

}

export class BlockVersionIndexFileNotFound extends BlockInstanceError {

    public name = 'BlockVersionIndexFileNotFound'
    public message = 'Индексный файл указанной версии блока не найден'

}

export class InstanceBlockVersionInUse extends BlockInstanceError {

    public name = 'InstanceBlockVersionInUse'
    public message = 'Попытка удалить используемый экземпляр версии блока'

}