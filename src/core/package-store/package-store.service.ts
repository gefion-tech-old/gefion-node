import { injectable, inject, named } from 'inversify'
import { TYPEORM_SYMBOL} from '../../dep/typeorm/typeorm.types'
import { OptionsInstallPackage, Package, PACKAGE_STORE_SYMBOL, Packages } from './package-store.types'
import { Package as PackageEntity } from './entities/package.entity'
import { PackageTag as PackageTagEntity } from './entities/package-tag.entity'
import { Repository } from 'typeorm'
import { IPackageStoreService } from './package-store.interface'
import { IGitManagerService } from './git-manager/git-manager.interface'

@injectable()
export class PackageStoreService implements IPackageStoreService {

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmAppRepository) 
        @named(PACKAGE_STORE_SYMBOL.PackageRepository)
        private packageRepository: Promise<Repository<PackageEntity>>,

        @inject(TYPEORM_SYMBOL.TypeOrmAppRepository)
        @named(PACKAGE_STORE_SYMBOL.PackageTagRepository)
        private packageTagRepository: Promise<Repository<PackageTagEntity>>,

        @inject(PACKAGE_STORE_SYMBOL.GitManagerService)
        private gitManager: IGitManagerService
    ) {}

    // TODO: Интегрировать запись в журнал действий для защиты от сбоев
    // TODO: На более высоком уровне не забывать делать обработку ошибок,
    // так как этот модуль этим не занимается от слова совсем
    // TODO: Интегрировать корректную работу временных пакетов. Временные пакеты
    // будут удаляться на основе последнего обращения к ним (lstat на папках).
    public async install(options: OptionsInstallPackage): Promise<Package> {
        const packageRepository = await this.packageRepository
        const gitManager = this.gitManager

        /**
         * Сгенерировать и получить адрес для подключения к удаленному
         * репозиторию
         */
        const remote = ((): string => {
            const remote = new URL(options.gitPath)

            if (!options.credential) {
                return remote.toString()
            }

            remote.username = options.credential.username
            remote.password = options.credential.password

            return remote.toString()
        })()

        /**
         * Получить актуальный экземпляр пакета из базы данных. Если пакета еще не существует,
         * то он будет добавлен и возвращен в корректном формате.
         */
        let pkg = await (async (): Promise<PackageEntity> => {
            let pkg = await packageRepository.findOne({
                where: {
                    gitPath: options.gitPath
                }
            })

            if (pkg) {
                return pkg
            }

            await gitManager.initRepo(remote, options.gitPath)
            const tags = await gitManager.tags(options.gitPath)

            pkg = packageRepository.create({
                gitPath: options.gitPath,
                type: options.type,
                tags: tags.map<PackageTagEntity>((tag: string): PackageTagEntity => {
                    return {
                        name: tag,
                        isInstalled: false
                    }
                })
            })

            return await packageRepository.save(pkg)
        })()

        /**
         * Установить тег, и вернуть актуальную версию пакета. Новые теги обновляются
         * (если сейчас данный тег не доступен) с расчётом на то, что старые не будут
         * затрагиваться. Теги могут только добавляться.
         */
        pkg = await (async (): Promise<PackageEntity> => {
            if (!pkg.tags.find(tag => tag.name === options.tag)) {
                await gitManager.fetchTags(remote, options.gitPath)

                const tags = await gitManager.tags(options.gitPath)
                pkg.tags = tags.map<PackageTagEntity>((tagName: string): PackageTagEntity => {
                    return {
                        name: tagName,
                        isInstalled: pkg.tags.find(tag => tag.name === tagName)?.isInstalled === true
                    }
                })
            }

            await gitManager.installTag(options.tag, options.gitPath)

            pkg.tags = pkg.tags.map(tag => {
                if (tag.name === options.tag) {
                    tag.isInstalled = true
                }

                return tag
            })

            pkg = await packageRepository.save(pkg)
            
            return pkg
        })()

        return {
            allAvailableTags: pkg.tags.map<string>(tag => tag.name),
            gitPath: options.gitPath,
            installedTags: pkg.tags
                .filter(tag => tag.isInstalled)
                .map<string>(tag => tag.name),
            type: options.type
        }
    }

    public async hasPackageTag(gitPath: string, tag: string): Promise<boolean> {
        const packageTagRepository = await this.packageTagRepository
        return await packageTagRepository.findOne({
            where: {
                package: gitPath,
                name: tag,
                isInstalled: true
            }
        }) ? true : false
    }

    public async hasAvailablePackageTag(gitPath: string, tag: string): Promise<boolean> {
        const packageTagRepository = await this.packageTagRepository
        return await packageTagRepository.findOne({
            where: {
                package: gitPath,
                name: tag
            }
        }) ? true : false
    }

    public async getPackages(): Promise<Packages> {
        const packageRepository = await this.packageRepository
        const pkgs = await packageRepository.find()
        
        return pkgs.map<Package>(pkg => ({
            allAvailableTags: pkg.tags.map<string>(tag => tag.name),
            gitPath: pkg.gitPath,
            installedTags: pkg.tags
                .filter(tag => tag.isInstalled)
                .map<string>(tag => tag.name),
            type: pkg.type
        }))
    }

    public async uninstall(gitPath: string, tag: string): Promise<void> {
        const packageTagRepository = await this.packageTagRepository
        const packageRepository = await this.packageRepository
        const gitManager = this.gitManager

        const packageTag = await packageTagRepository.findOne({
            where: {
                package: gitPath,
                name: tag
            }
        })

        if (packageTag) {
            await gitManager.uninstallTag(tag, gitPath)
            packageTag.isInstalled = false
            await packageTagRepository.save(packageTag)
        }

        /**
         * Удалить репозиторий, если у него нет установленных тегов
         */
        const countPackageTag = await packageTagRepository.count({
            where: {
                package: gitPath,
                isInstalled: true
            }
        })

        if (countPackageTag <= 0) {
            const pkg = await packageRepository.findOne({
                where: {
                    gitPath: gitPath
                }
            })

            if (pkg) {
                await gitManager.removeRepo(gitPath)
                await packageRepository.remove(pkg)
            }
        }
    }

}