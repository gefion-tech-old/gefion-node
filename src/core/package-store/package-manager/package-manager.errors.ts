export class NonExistenPackage extends Error {

    public constructor(
        public gitPath: string
    ) {
        super()
    }

}