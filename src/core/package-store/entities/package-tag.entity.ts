import { injectable } from 'inversify'
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm'
import { Package } from './package.entity'

@injectable()
@Entity()
export class PackageTag {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Package, pkg => pkg.tags)
    package: Package;

    @Column()
    name: string;

    @Column({
        default: false
    })
    isInstalled: boolean;

}