export class MetadataError extends Error {}

export class RevisionNumberError extends MetadataError {

    public name = 'RevisionNumberError'
    public message = 'Ошибка номера редакции при сохранении метаданных'

}