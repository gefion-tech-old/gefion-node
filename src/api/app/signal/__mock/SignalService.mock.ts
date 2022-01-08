import { injectable } from 'inversify'
import { ISignalService } from '../signal.interface'
import { Method } from '../../method/method.types'
import { 
    Signal, 
    CreateSignal,
    EventContext
} from '../signal.types'

export function getSignalService(mock: ISignalService): new() => ISignalService {
    @injectable()
    class SignalService implements ISignalService {

        create(options: CreateSignal, nestedTransaction?: boolean): any {
            return mock.create(options, nestedTransaction)
        }

        isExists(signal: Signal): any {
            return mock.isExists(signal)
        }

        getSignalId(signal: Signal): any {
            return mock.getSignalId(signal)
        }
    
        setCustomMetadata(signal: Signal, customMetadata: any, nestedTransaction?: boolean): any {
            return mock.setCustomMetadata(signal, customMetadata, nestedTransaction)
        }
    
        addValidator(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.addValidator(signal, method, nestedTransaction)
        }

        setSignalValidatorMetadata(signal: any, validator: any, snapshotMetadata: any, nestedTransaction: any): any {
            return mock.setSignalValidatorMetadata(signal, validator, snapshotMetadata, nestedTransaction)
        }
    
        removeValidator(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.removeValidator(signal, method, nestedTransaction)
        }
    
        addGuard(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.addGuard(signal, method, nestedTransaction)
        }

        setSignalGuardMetadata(signal: any, guard: any, snapshotMetadata: any, nestedTransaction: any): any {
            return mock.setSignalGuardMetadata(signal, guard, snapshotMetadata, nestedTransaction)
        }
    
        removeGuard(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.removeGuard(signal, method, nestedTransaction)
        }
    
        addFilter(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.addFilter(signal, method, nestedTransaction)
        }

        setSignalFilterMetadata(signal: any, filter: any, snapshotMetadata: any, nestedTransaction: any): any {
            return mock.setSignalFilterMetadata(signal, filter, snapshotMetadata, nestedTransaction)
        }
    
        removeFilter(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.removeFilter(signal, method, nestedTransaction)
        }
    
        connect(outSignal: Signal, intoSignal: Signal, nestedTransaction?: boolean): any {
            return mock.connect(outSignal, intoSignal, nestedTransaction)
        }
    
        unconnect(outSignal: Signal, intoSignal: Signal, nestedTransaction?: boolean): any {
            return mock.unconnect(outSignal, intoSignal, nestedTransaction)
        }
    
        remove(signal: Signal, nestedTransaction?: boolean): any {
            return mock.remove(signal, nestedTransaction)
        }
    
        onMutation(handler: (context: EventContext) => void): any {
            return mock.onMutation(handler)
        }

    }

    return SignalService
}