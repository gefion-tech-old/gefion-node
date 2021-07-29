import { injectable } from 'inversify'
import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm'
import { PackageTag } from './package-tag.entity'

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
    type: 'constant' | 'temporary';

    @OneToMany(() => PackageTag, tag => tag.package, {
        cascade: true,
        eager: true
    })
    tags: PackageTag[];

} 
  