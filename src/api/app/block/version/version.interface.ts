import { 
    AssociateOptions,
    UnAssociateOptions
} from './version.types'

export interface IVersionService {

    /**
     * Ассоциировать указанный путь к папке с блоком определённой версии. Можно
     * считать, что с момента ассоциации блок установлен и доступен приложению
     */
    associate(options: AssociateOptions): Promise<void>

    /**
     * Полностью удалить ассоциацию указанного блока при условии, что у данного
     * блока нет никаких запущенных экземпляров. Не трогает физические файлы,
     * их, при необходимости, нужно удалять отдельно
     */
    unassociate(options: UnAssociateOptions): Promise<void>

}