import { injectable, inject, named } from 'inversify'
import { TYPEORM_SYMBOL } from '../../../dep/typeorm/typeorm.types'
import { IPackageManagerService } from './package-manager.interface'
import { Package as PackageEntity } from '../entities/package.entity'
import { PackageTag as PackageTagEntity } from '../entities/package-tag.entity'
import { NonExistenPackage } from './package-manager.errors'
import { 
    OptionsInstallPackageTag, 
    OptionsInstallPackage,  
    PACKAGE_STORE_SYMBOL, 
    Packages,
    Package,
    Tag
} from '../package-store.types'
import { IGitManagerService } from '../git-manager/git-manager.interface'
import { Repository } from 'typeorm'

@injectable()
export class PackageManagerService implements IPackageManagerService {

    public constructor(
        @inject(TYPEORM_SYMBOL.TypeOrmAppRepository) 
        @named(PACKAGE_STORE_SYMBOL.PackageRepository)
        private packageRepository: Promise<Repository<PackageEntity>>,

        @inject(TYPEORM_SYMBOL.TypeOrmAppRepository)
        @named(PACKAGE_STORE_SYMBOL.PackageTagRepository)
        private packageTagRepository: Promise<Repository<PackageTagEntity>>,

        @inject(PACKAGE_STORE_SYMBOL.GitManagerService)
        private gitManager: IGitManagerService,
    ) {}

    public async installPackage(options: OptionsInstallPackage): Promise<void> {
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
         * Установить пакет
         */
        await (async () => {
            await gitManager.initRepo(remote, options.gitPath)
            const tags = await gitManager.tags(options.gitPath)
    
            const pkg = packageRepository.create({
                gitPath: options.gitPath,
                type: options.type,
                tags: tags.map<PackageTagEntity>((tag: string): PackageTagEntity => {
                    return {
                        name: tag,
                        isInstalled: false
                    }
                })
            })
    
            await packageRepository.save(pkg)
        })()
    }

    public async installPackageTag(options: OptionsInstallPackageTag): Promise<void> {
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
         * Вернуть обновленные из удаленного сервера теги пакета, если
         * запрашиваемого тега не существует
         */
        const tags = await (async (): Promise<string[] | undefined> => {
            if (!await this.hasPackageTag(options.gitPath, options.tag)) {
                await gitManager.fetchTags(remote, options.gitPath)
                return await gitManager.tags(options.gitPath)
            }
            return
        })()

        /**
         * Сделать слияние новых и старых тегов, а после вернуть актуальную, но несохранённую
         * версию пакета
         */
        const pkg = await (async (): Promise<PackageEntity> => {
            const pkg = await packageRepository.findOne({
                where: {
                    gitPath: options.gitPath
                }
            })

            if (!pkg) {
                throw new NonExistenPackage(options.gitPath)
            }

            if (tags) {
                pkg.tags = tags.map<PackageTagEntity>((tagName: string): PackageTagEntity => {
                    return {
                        name: tagName,
                        isInstalled: pkg.tags.find(tag => tag.name === tagName)?.isInstalled === true
                    }
                })
            }

            return pkg
        })()

        /**
         * Установить желаемый тег и обновить информацию пакета
         */
        await (async () => {
            await gitManager.installTag(options.tag, options.gitPath)

            pkg.tags = pkg.tags.map(tag => {
                if (tag.name === options.tag) {
                    tag.isInstalled = true
                }

                return tag
            })

            await packageRepository.save(pkg)
        })()
    }

    public async hasPackage(gitPath: string): Promise<boolean> {
        const packageRepository = await this.packageRepository
        return await packageRepository.findOne({
            where: {
                gitPath: gitPath
            }
        }) ? true : false
    }

    public async hasPackageTag(gitPath: string, tag: Tag): Promise<boolean> {
        const packageTagRepository = await this.packageTagRepository
        return await packageTagRepository.findOne({
            where: {
                package: gitPath,
                name: tag,
                isInstalled: true
            }
        }) ? true : false
    }

    public async hasAvailablePackageTag(gitPath: string, tag: Tag): Promise<boolean> {
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

    public async uninstallPackage(gitPath: string): Promise<void> {
        const packageRepository = await this.packageRepository
        const gitManager = this.gitManager

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

    public async uninstallPackageTag(gitPath: string, tag: Tag): Promise<void> {
        const packageTagRepository = await this.packageTagRepository
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
    }

    public async isEmptyPackage(gitPath: string): Promise<boolean> {
        const packageTagRepository = await this.packageTagRepository
        return await packageTagRepository.count({
            where: {
                package: gitPath,
                isInstalled: true
            }
        }) <= 0
    }

}