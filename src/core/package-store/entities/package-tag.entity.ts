import { injectable } from 'inversify'
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm'
import { Package } from './package.entity'

@injectable()
@Entity()
export class PackageTag {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Package, pkg => pkg.tags, {
        nullable: false,
        orphanedRowAction: 'delete',
        onDelete: 'CASCADE'
    })
    package: Package;

    /**
     * Название тега
     */
    @Column()
    name: string;

    /**
     * Установлен ли данный тег на данный момент времени или нет
     */
    @Column({
        default: false
    })
    isInstalled: boolean;

}