import { InitRunner } from '../init.types'

export function getInitRunner(mock: {
    run: () => void
}): InitRunner {
    return new class implements InitRunner {

        public async run(): Promise<void> {
            mock.run()
        }

    }
}