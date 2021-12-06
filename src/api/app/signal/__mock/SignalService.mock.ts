import { injectable } from 'inversify'
import { ISignalService } from '../signal.interface'
import { Method } from '../../method/method.types'
import { 
    Signal, 
    CreateSignal,
    EventContext
} from '../signal.type'

export function getSignalService(mock: ISignalService): new() => ISignalService {
    @injectable()
    class SignalService implements ISignalService {

        createIfNotCreated(options: CreateSignal, nestedTransaction?: boolean): any {
            return mock.createIfNotCreated(options, nestedTransaction)
        }

        isExists(signal: Signal): any {
            return mock.isExists(signal)
        }

        getSignalId(signal: Signal): any {
            return mock.getSignalId(signal)
        }

        getMetadata(signal: Signal): any {
            return mock.getMetadata(signal)
        }
    
        setCustomMetadata(signal: Signal, customMetadata: any, nestedTransaction?: boolean): any {
            return mock.setCustomMetadata(signal, customMetadata, nestedTransaction)
        }
    
        addValidator(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.addValidator(signal, method, nestedTransaction)
        }
    
        removeValidator(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.removeValidator(signal, method, nestedTransaction)
        }
    
        addGuard(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.addGuard(signal, method, nestedTransaction)
        }
    
        removeGuard(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.removeGuard(signal, method, nestedTransaction)
        }
    
        addFilter(signal: Signal, method: Method, nestedTransaction?: boolean): any {
            return mock.addFilter(signal, method, nestedTransaction)
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
    
        onSignalMutation(handler: (context: EventContext) => void): any {
            return mock.onSignalMutation(handler)
        }

    }

    return SignalService
}