export const RPC_SYMBOL = {
    RPCService: Symbol('RPCService'),
    RPCInfoEntity: Symbol('RPCInfoEntity'),
    RPCStoreService: Symbol('RPCStoreService'),
    RPCInit: Symbol('RPCInit'),
    RPCRequestService: Symbol('RPCRequestService'),
    RPCMethod: Symbol('RPCMethod'),
    RPCConfig: Symbol('RPCConfig')
}

export type RPCHandler = (...params: any[]) => Promise<any>

export type RPCRequestHttpType = {
    method: string
    params: any[]
    appId: string
}

export type RPCResponseHttpType = {
    result: any
    error: any
}

export type RPCSyncRequest = {
    appId: string
}

export interface IRPCMethod {

    /**
     * Название RPC метода
     */
    name(): string

    /**
     * Обработчик RPC метода 
     */
    handler: RPCHandler

}