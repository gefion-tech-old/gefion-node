import { injectable, inject } from 'inversify'
import { IIssueService } from './issue.interface'
import { Applicant } from './issue.types'
import { Method } from '../method.types'
import { METHOD_SYMBOL } from '../method.types'
import { IMethodService } from '../method.interface'
import { VM_SYMBOL } from '../../../../core/vm/vm.types'
import { IVMService } from '../../../../core/vm/vm.interface'
import { MethodComplaintError } from './issue.errors'

@injectable()
export class IssueService implements IIssueService {

    public constructor(
        @inject(METHOD_SYMBOL.MethodService)
        private methodService: IMethodService,

        @inject(VM_SYMBOL.VMService)
        private vmService: IVMService
    ) {}

    public complain(applicant: Applicant, method: Method, error: any): void {
        const scriptId = this.methodService.getScriptId(method)

        if (!scriptId) {
            return
        }

        const complain = new MethodComplaintError(applicant, method, error)
        
        this.vmService.error(scriptId, complain)
    }

}