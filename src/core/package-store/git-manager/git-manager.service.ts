import { injectable, inject } from 'inversify'
import { IGitManagerService } from './git-manager.interface'
import { FS_SYMBOL, FsExtraType, FsPromisesType } from '../../../dep/fs/fs.types'
import { PACKAGE_STORE_SYMBOL, PackageStoreConfig } from '../package-store.types'
import { GIT_SYMBOL } from '../../../dep/git/git.types'
import { SimpleGit } from 'simple-git'
import path from 'path'

@injectable()
export class GitManagerService implements IGitManagerService {

    public constructor(
        @inject(FS_SYMBOL.FsExtra)
        private fsExtra: FsExtraType,

        @inject(FS_SYMBOL.FsPromises)
        private fsPromises: FsPromisesType,

        @inject(PACKAGE_STORE_SYMBOL.PackageStoreConfig)
        private config: Promise<PackageStoreConfig>,

        @inject(GIT_SYMBOL.Git)
        private git: Promise<SimpleGit>
    ) {}

    private encode(string: string): string {
        return encodeURIComponent(string)
    }

    private decode(string: string): string {
        return decodeURIComponent(string)
    }

    public async initRepo(remote: string, repoName: string): Promise<void> {
        repoName = this.encode(repoName)
        const config = await this.config
        const git = await this.git

        await this.removeRepo(repoName)
        await this.fsExtra.ensureDir(path.join(config.repoDir, repoName))
        
        await git.cwd(path.join(config.repoDir, repoName))
        await git.init()
        await git.raw(['fetch', '--tags', remote])
    }

    public async removeRepo(repoName: string): Promise<void> {
        repoName = this.encode(repoName)
        const config = await this.config
        await this.fsExtra.remove(path.join(config.repoDir, repoName))
        await this.fsExtra.remove(path.join(config.tagDir, repoName))
    }

    public async listRepo(): Promise<string[]> {
        const config = await this.config

        if (!await this.fsExtra.pathExists(config.repoDir)) {
            return []
        }

        const listRepo = []
        const files = await this.fsPromises.readdir(config.repoDir, {
            withFileTypes: true
        })

        for (const file of files) {
            listRepo.push(this.decode(file.name))
        }

        return listRepo
    }

    public async tags(repoName: string): Promise<string[]> {
        repoName = this.encode(repoName)
        const config = await this.config
        const git = await this.git

        await git.cwd(path.join(config.repoDir, repoName))
        const tags = await git.tags()

        return tags.all
    }

    public async fetchTags(remote: string, repoName: string): Promise<void> {
        repoName = this.encode(repoName)
        const config = await this.config
        const git = await this.git

        await git.cwd(path.join(config.repoDir, repoName))
        await git.raw(['fetch', '--tags', remote])
    }

    public async installTag(tag: string, repoName: string): Promise<void> {
        repoName = this.encode(repoName)
        const config = await this.config
        const git = await this.git

        const targetTagDir = path.join(config.tagDir, repoName, this.encode(tag))
        const targetRepoDir = path.join(config.repoDir, repoName)

        await this.fsExtra.emptyDir(targetTagDir)
        await this.fsExtra.copy(targetRepoDir, targetTagDir)

        await git.cwd(targetTagDir)
        await git.checkout(tag)

        await this.fsExtra.remove(path.join(targetTagDir, '.git'))
    }

    public async listInstalledTags(repoName: string): Promise<string[]> {
        repoName = this.encode(repoName)
        const config = await this.config
        const targetDir = path.join(config.tagDir, repoName)

        if (!await this.fsExtra.pathExists(targetDir)) {
            return []
        }

        const tagList = []
        const files = await this.fsPromises.readdir(targetDir, {
            withFileTypes: true
        })

        for (const file of files) {
            tagList.push(this.decode(file.name))
        }

        return tagList
    }

    public async uninstallTag(tag: string, repoName: string): Promise<void> {
        repoName = this.encode(repoName)
        tag = this.encode(tag)
        const config = await this.config

        await this.fsExtra.remove(path.join(config.tagDir, repoName, tag))
    }

}