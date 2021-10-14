export const BLOCK_SYMBOL = {
    BlockService: Symbol('BlockService'),
    BlockEntity: Symbol('BlockEntity')
}

export type AssociateOptions = {
    /**
     * Уникальное название блока
     */
    readonly name: string
    /**
     * Уникальная версия блока
     */
    readonly version: string
    /**
     * Физический путь к данной версии блока
     */
     readonly path: string
}

export type UnAssociateOptions = Omit<AssociateOptions, 'path'>