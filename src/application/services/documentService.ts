import {DocumentState, Operation, ActiveUser} from "../../core/document/types.ts";
import {WebSocketConnection, PartyChangedMessage} from "../../infrastructure/websockets/types.ts";
import {applyOperation} from "../../core/document/operations.ts";
import {DocumentHttpClient} from "./documentHttpClient.ts";
import {
    APPLY_OPERATION_COMMAND,
    JOIN_DOCUMENT_GROUP_COMMAND,
    LEAVE_DOCUMENT_GROUP_COMMAND,
    PARTY_CHANGED_COMMAND,
    RECEIVE_OPERATION_COMMAND,
} from "./service-constants.ts";

export function documentService(deps: { connection: WebSocketConnection, httpClient: DocumentHttpClient, state: DocumentState }){
    let activeUsers: ActiveUser[] = [];
    let pendingOperations: Operation[] = [];
    let currentState: DocumentState = deps.state;

    const listeners = new Set<(state: DocumentState) => void>();

    const updateState = (newState: DocumentState) => {
        currentState = newState;
        notifyAll();
    };

    const notifyAll = () => {
        listeners.forEach(listener => listener(currentState));
    };

    const log = (event: string, data?: any) => {
        console.log('[DocumentService]', event, data || '');
    };

    async function resyncDocument() {
        if (currentState.status === 'loading' || currentState.status === 'error') {
            return;
        }

        const documentId = currentState.document.id;
        const savedPendingOps = [...pendingOperations];

        log('[DocumentService] Starting re-sync');

        updateState({
            status: 'syncing',
            document: currentState.document,
            activeUsers: activeUsers
        });
        notifyAll();

        try {
            const syncedDoc = await deps.httpClient.getDocument(documentId);
            updateState({
                status: 'synced',
                document: syncedDoc,
                serverDocument: syncedDoc,
                activeUsers: activeUsers
            });

            let reconciledDocument= syncedDoc;
            const successfullyAppliedOps: Operation[] = [];

            for (const op of savedPendingOps) {
                try {
                    const updatedOp = {
                        ...op,
                        version: reconciledDocument.version
                    };
                    reconciledDocument = applyOperation(reconciledDocument, updatedOp);
                    successfullyAppliedOps.push(updatedOp);
                    log('[DocumentService] Reapplied pending operation during re-sync', updatedOp);
                } catch (error) {
                    log('[DocumentService] Failed to reapply operation during re-sync. Discarding...', { operation: op, error });
                }
            }
            pendingOperations = successfullyAppliedOps;

            for (const op of successfullyAppliedOps) {
                try {
                    await deps.connection.sendMessage(APPLY_OPERATION_COMMAND, op);
                    log('[DocumentService] Re-sent pending operation to server after re-sync', op);
                } catch (error) {
                    log('[DocumentService] Failed to re-send operation to server after re-sync.', { operation: op, error });
                }
            }

            if (pendingOperations.length > 0) {
                updateState({
                    status: 'optimistic',
                    document: reconciledDocument,
                    serverDocument: syncedDoc,
                    pendingOperation: pendingOperations[0],
                    activeUsers: currentState.activeUsers
                });
            } else {
                updateState({
                    status: 'synced',
                    document: reconciledDocument,
                    serverDocument: syncedDoc,
                    activeUsers: currentState.activeUsers
                });
            }

            notifyAll();
        } catch (error) {
            console.error('[DocumentService] Error re-syncing document:', error);
            updateState({ status: 'error', error: error as Error });
            notifyAll();
        }
    }

   function handleReceiveOperation(operation: Operation) {
        if (currentState.status === 'error' || currentState.status === 'loading' || !('serverDocument' in currentState)) {
            log('[DocumentService] Ignoring operation. Document in invalid state.', currentState);
            return;
        }

        // Apply the operation to the server document
        let newServerDoc = applyOperation(currentState.serverDocument, operation);

       if (pendingOperations.length > 0) {
           const pending = pendingOperations[0];
           log('[DocumentService] Comparing received operation with pending operation', {
               receivedOperation: operation,
               pendingOperation: pending
           });
           if (
               pending.version === operation.version && pending.type === operation.type && pending.position === operation.position &&
               (pending.content === undefined || pending.content === operation.content)
           ) {
               log('[DocumentService] Removing acknowledged pending operation:', pendingOperations[0]);
               pendingOperations.shift();
           }
       }

       log('[DocumentService] Pending operations after:', pendingOperations);

       let optimisticDoc = newServerDoc;
       for (const pendingOp of pendingOperations) {
           optimisticDoc = applyOperation(optimisticDoc, pendingOp);
       }

       updateState(
           pendingOperations.length > 0
               ? {
                   status: 'optimistic',
                   document: optimisticDoc,
                   serverDocument: newServerDoc,
                   pendingOperation: pendingOperations[0],
                   activeUsers: currentState.activeUsers
               }
               : {
                   status: 'synced',
                   document: newServerDoc,
                   serverDocument: newServerDoc,
                   activeUsers: currentState.activeUsers
               }
       );
       notifyAll();
   }

    function handlePartyChanged(message: PartyChangedMessage) {
        log('PartyChanged', {
            ...message,
            action: message.action,
        });

       activeUsers = message.activeUsers;
       if (currentState.status !== 'loading' && currentState.status !== 'error') {
           updateState({
               ...currentState,
               activeUsers: activeUsers
           });
           notifyAll();
       }
    }

    function setupSignalRHandlers() {
        deps.connection.onMessage(PARTY_CHANGED_COMMAND, handlePartyChanged);
        deps.connection.onMessage(RECEIVE_OPERATION_COMMAND, handleReceiveOperation);
        log('SignalR event handlers registered.');
    }

    function teardownSignalRHandlers() {
        deps.connection.offMessage(PARTY_CHANGED_COMMAND, handlePartyChanged);
        deps.connection.offMessage(RECEIVE_OPERATION_COMMAND, handleReceiveOperation);
        log('SignalR event handlers unregistered.');
    }

    return {
        async loadDocument(documentId: string) {
            log('[DocumentService] Loading document', documentId);
            try {
                const doc = await deps.httpClient.getDocument(documentId);
                updateState({
                    status: 'synced',
                    document: doc,
                    serverDocument: doc,
                    activeUsers: activeUsers
                });

                pendingOperations = [];
                notifyAll();

                await deps.connection.connect();
                setupSignalRHandlers();
                await deps.connection.sendMessage(JOIN_DOCUMENT_GROUP_COMMAND, documentId);
                log('[DocumentService] Joined document group', documentId);

            } catch (error) {
                log('[DocumentService] Error loading document:', error);

                let errorMessage = 'Failed to load document.';
                if (error instanceof Error) {
                    errorMessage += ` ${error.message}`;
                }

                updateState({
                    status: 'error',
                    error: new Error(errorMessage)
                });

                notifyAll();
            }
        },
        async applyLocalEdit(operation: Operation) {
            if (currentState.status !== 'synced' && currentState.status !== 'optimistic') {
                log('[DocumentService] Cannot apply local edit. Document not in a valid state.', currentState);
                return;
            }

            const currentDoc = currentState.document;
            const newVersion = currentDoc.version + 1;
            const operationWithVersion: Operation = {
                ...operation,
                version: newVersion
            };

            log('[DocumentService] **** Applying local edit', operationWithVersion);
            pendingOperations.push(operationWithVersion);

            const updatedDoc = applyOperation(currentDoc, operationWithVersion);

            updateState({
                status: 'optimistic',
                document: updatedDoc,
                serverDocument: currentState.serverDocument,
                pendingOperation: pendingOperations[0],
                activeUsers: activeUsers
            });
            notifyAll();

            try {
                await deps.connection.sendMessage(APPLY_OPERATION_COMMAND, operationWithVersion);
                log('[DocumentService] Successfully sent operation to server', operationWithVersion);
            } catch (error) {
                log('[DocumentService] Error sending operation to server:', error);

                pendingOperations = pendingOperations.filter(op => op !== operationWithVersion);

                if (pendingOperations.length === 0) {
                    updateState({
                        status: 'synced',
                        document: currentState.serverDocument,
                        serverDocument: currentState.serverDocument,
                        activeUsers
                    });
                    notifyAll();
                }
                throw error;
            }
        },
        async resyncDocument() {
            log('[DocumentService] Resyncing document');
            await resyncDocument();
        },
        subscribe(listener: (state: DocumentState) => void) {
            listeners.add(listener);
            listener(currentState);

            return () => {
                listeners.delete(listener);
            };
        },
        async cleanup() {
            log('[DocumentService] Cleaning up');
            teardownSignalRHandlers();
            if (currentState.status !== 'loading' && currentState.status !== 'error') {
                try {
                    if (deps.connection.isConnected()) {
                        console.log('[DocumentService] Leaving document group:', currentState.document.id);
                        await deps.connection.sendMessage(LEAVE_DOCUMENT_GROUP_COMMAND, currentState.document.id);
                    } else {
                        console.log('[DocumentService] Skipping leave document group. Connection not established.');
                    }

                } catch (error) {
                     log('[DocumentService] Error leaving document group:', error);
                }
            }
            await deps.connection.disconnect();
            pendingOperations = [];
            activeUsers = [];
            notifyAll();
        },
        getState: () => currentState,
        getPendingOperations: () => [...pendingOperations]
    };
}