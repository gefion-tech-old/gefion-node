import { injectable } from 'inversify'
import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm'
import { PackageTag } from './package-tag.entity'

@injectable()
@Entity()
export class Package {

    /**
     * Путь к git репозиторию пакета
     */
    @PrimaryColumn({
        nullable: false
    })
    gitPath: string;

    /**
     * Тип пакета.
     * 
     * constant - Постоянный пакет. Указывает на то, что пакет установлен на сервер
     *      владельцем какого-либо сайта и для конкретных целей. Должен быть удален только явно.
     * 
     * temporary - Временный пакет. Указывает на то, что пакет установлен на сервер только
     *      для единовременного просмотра его функционала. Через время он должен быть
     *      удалён автоматически для освобождения ресурсов. Предполагается, что
     *      данный тип пакетов не будет использоваться в пользовательских приложениях, только
     *      в служебных.
     */
    @Column({
        nullable: false
    })
    type: string;

    /**
     * Все доступные на данный момент теги пакета
     */
    @OneToMany(() => PackageTag, tag => tag.package, {
        onDelete: 'CASCADE'
    })
    tags: PackageTag[];

} 
  