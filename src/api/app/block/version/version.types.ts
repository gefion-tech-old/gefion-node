export type Version = {
    /**
     * Уникальное название блока
     */
    readonly name: string
    /**
     * Уникальная версия блока
     */
    readonly version: string
}

export type AssociateOptions = Version & {

    /**
     * Физический путь к данной версии блока
     */
     readonly path: string
}

export type UnAssociateOptions = Version