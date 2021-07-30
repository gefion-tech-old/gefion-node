import { injectable } from 'inversify'
import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm'
import { PackageTag } from './package-tag.entity'
import { PackageType } from '../package-store.types'

@injectable()
@Entity()
export class Package {

    @PrimaryColumn({
        nullable: false
    })
    gitPath: string;

    @Column({
        nullable: false
    })
    type: PackageType;

    @OneToMany(() => PackageTag, tag => tag.package, {
        cascade: true,
        eager: true
    })
    tags: PackageTag[];

} 
  