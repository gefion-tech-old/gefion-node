import { getContainer } from '../../../../inversify.config'
import { IIssueService } from './issue.interface'
import { METHOD_SYMBOL } from '../method.types'
import { IMethodService } from '../method.interface'
import { VM_SYMBOL } from '../../../../core/vm/vm.types'
import { getVMService } from '../../../../core/vm/__mock/VMService.mock'
import { CreatorType } from '../../creator/creator.types'
import { Applicant } from './issue.types'
import { MethodComplaintError } from './issue.errors'

beforeAll(async () => {
    const container = await getContainer()
    container.snapshot()
})

afterAll(async () => {
    const container = await getContainer()
    container.restore()
})

describe('IssueService в MethodModule', () => {

    it(`
        Жалоба успешно отправляется в запущенный скрипт метода
    `, async () => {
        const container = await getContainer()
        container.snapshot()

        const errorScriptFn = jest.fn()
        const scriptId = Symbol('ScriptId')

        container.rebind(VM_SYMBOL.VMService)
            .to(getVMService({
                error: (scriptId, error) => {
                    errorScriptFn(scriptId, error)
                },
                info: () => ({} as any),
                listScripts: () => [],
                on: () => {},
                remove: () => {},
                run: async () => scriptId,
                stats: async () => undefined
            }))
            .inSingletonScope()

        const methodService = container
            .get<IMethodService>(METHOD_SYMBOL.MethodService)
        const issueService = container
            .get<IIssueService>(METHOD_SYMBOL.IssueService)

        const method1 = {
            namespace: 'namespace',
            type: 'type',
            name: 'name'
        }

        await methodService.method({
            ...method1,
            handler: () => {},
            scriptId: scriptId,
            creator: {
                type: CreatorType.System
            }
        })

        const applicant: Applicant = {
            type: CreatorType.System,
            context: {
                hello: true
            }
        }

        const MyError = class extends Error {
            public name = 'MyError'
        }

        const complaint = new MethodComplaintError(applicant, method1, new MyError)

        expect(issueService.complain(complaint.applicant, complaint.method, complaint.error)).toBeUndefined()
        expect(errorScriptFn).toBeCalledTimes(1)
        expect(errorScriptFn).toBeCalledWith(
            scriptId,
            expect.objectContaining(complaint)
        )

        container.restore()
    })

})