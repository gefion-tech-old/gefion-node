import { EntityRepository, AbstractRepository } from 'typeorm'
import { mutationQuery } from '../../../../core/typeorm/utils/mutation-query'
import { Metadata } from '../../entities/metadata.entity'
import { RevisionNumberError } from '../metadata.errors'
import { SnapshotMetadata } from '../metadata.types'

@EntityRepository(Metadata)
export class MetadataRepository extends AbstractRepository<Metadata<object>> {

    /**
     * Обновить указанные метаданные с проверкой номера их редакции
     */
    public async update<T>(id: number, snapshotMetadata: SnapshotMetadata<T>, nestedTransaction = false): Promise<void> {
        const updateResult = await mutationQuery(nestedTransaction, () => {
            return this.manager
                .createQueryBuilder()
                .update(Metadata)
                .set({
                    metadata: snapshotMetadata.metadata,
                    revisionNumber: snapshotMetadata.revisionNumber + 1
                })
                .where('id = :id AND revisionNumber = :revisionNumber', {
                    id: id,
                    revisionNumber: snapshotMetadata.revisionNumber
                })
                .execute()
        })

        if (updateResult.affected === 0) {
            throw new RevisionNumberError
        }
    }

}