export class CreatorError extends Error {}

export class ResourceAlreadyHasCreator extends CreatorError {

    public name = 'ResourceAlreadyHasCreator'
    public message = 'У ресурса уже есть создатель'

}