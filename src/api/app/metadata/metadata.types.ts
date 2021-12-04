export const METADATA_SYMBOL = {
    MetadataEntity: Symbol('MetadataEntity')
}

export interface SnapshotMetadata<T extends Object> {
    /**
     * Фактические метаданные
     */
    metadata: T
    /**
     * Номер ревизии методанных
     */
    revisionNumber: number
}