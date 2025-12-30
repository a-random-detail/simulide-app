import {DocumentState, Operation, ActiveUser, Document} from "../../core/document/types.ts";
import {WebSocketConnection, PartyChangedMessage} from "../../infrastructure/websockets/types.ts";
import {applyOperation} from "../../core/document/operations.ts";
import {DocumentHttpClient} from "./documentHttpClient.ts";
import {
    APPLY_OPERATION_COMMAND,
    JOIN_DOCUMENT_GROUP_COMMAND,
    LEAVE_DOCUMENT_GROUP_COMMAND,
    PARTY_CHANGED_COMMAND
} from "./service-constants.ts";

export function documentService(deps: { connection: WebSocketConnection, httpClient: DocumentHttpClient}){

    let state: DocumentState = { status: 'loading' };
    let activeUsers: ActiveUser[] = [];
    let pendingOperations: Operation[] = [];

    const listeners = new Set<(state: DocumentState) => void>();

    const notifyAll = () => {
        listeners.forEach(listener => listener(state));
    };

    const log = (event: string, data?: any) => {
        console.log('[DocumentService]', event, data || '');
    };

    async function resyncDocument() {
        if (state.status === 'loading' || state.status === 'error') {
            return;
        }

        const documentId = state.document.id;
        const savedPendingOps = [...pendingOperations];

        log('[DocumentService] Starting re-sync');

        state = {
            status: 'syncing',
            document: state.document,
            activeUsers: activeUsers
        };
        notifyAll();

        try {
            const syncedDoc = await deps.httpClient.getDocument(documentId);
            state = {
                status: 'synced',
                document: syncedDoc,
                serverDocument: syncedDoc,
                activeUsers: activeUsers
            };

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
                state = {
                    status: 'optimistic',
                    document: reconciledDocument,
                    serverDocument: syncedDoc,
                    pendingOperation: pendingOperations[0],
                    activeUsers: state.activeUsers
                }
            } else {
                state = {
                    status: 'synced',
                    document: reconciledDocument,
                    serverDocument: syncedDoc,
                    activeUsers: state.activeUsers
                }
            }

            notifyAll();
        } catch (error) {
            console.error('[DocumentService] Error re-syncing document:', error);
            state = { status: 'error', error: error as Error };
            notifyAll();
        }
    }

    function handleReceiveOperation(operation: Operation) {
        const myConnectionId = deps.connection.getConnectionId();
        log('[DocumentService] ReceiveOperation', {
            operation,
            currentState: state.status,
            currentVersion: state.status !== 'loading' && state.status !== 'error' ? state.document.version : 'N/A',
            isOwnOperation: operation.userId === myConnectionId
        });

        if (state.status === 'error' || state.status === 'loading') {
            return;
        }

        if (operation.userId === myConnectionId) {
            console.log('[DocumentService] Ignoring own operation');

            if (pendingOperations.length > 0) {
                const ackedOp = pendingOperations[0];

                if (ackedOp.version === operation.version) {
                    pendingOperations.shift();
                    log('[DocumentService] Acknowledged own operation', {operation: ackedOp, remainingPending: pendingOperations.length });

                    if (state.status === 'optimistic') {
                        if (pendingOperations.length === 0) {
                            state = {
                                status: 'synced',
                                document: state.document,
                                serverDocument: state.serverDocument || {} as Document,
                                activeUsers: state.activeUsers
                            };
                        }
                    } else {
                        state = {
                            status: 'optimistic',
                            document: state.document,
                            serverDocument: state.status === 'syncing' ? {} as Document : state.serverDocument,
                            pendingOperation: pendingOperations[0],
                            activeUsers: state.activeUsers
                        };
                    }

                    }
                    notifyAll();
                }

        }

        if (state.status === 'optimistic') {
            log('[DocumentService] Received operation while in optimistic state. Transitioning to syncing state.');
            resyncDocument();
            return;
        }

        if (state.status === 'synced') {
            const currentVersion = state.document.version;

            if (operation.version === currentVersion) {
                log('[DocumentService] Applying operation to synced document in order');

                try {
                    const newDoc = applyOperation(state.document, operation);
                    state = {
                        status: 'synced',
                        document: newDoc,
                        serverDocument: newDoc,
                        activeUsers: state.activeUsers
                    };
                    return;
                } catch (error) {
                    log('[DocumentService] Error applying operation:', error);
                    resyncDocument();
                    return;
                }
            }

            if (operation.version > currentVersion) {
                log('[DocumentService] Operation version ahead of current document version. Resyncing document.', {
                    received: operation.version,
                    current: currentVersion,
                    gap: operation.version - currentVersion
                });
                resyncDocument();
                return;
            }
            if (operation.version < currentVersion) {
                console.warn('[DocumentService] Received out-of-order operation. Ignoring.', {
                    received: operation.version,
                    current: currentVersion
                });
                return;
            }

        }

        if (state.status === 'syncing') {
            console.log('[DocumentService] Ignoring operation while syncing');
            return;
        }
    }

    function handlePartyChanged(message: PartyChangedMessage) {
       log('PartyChanged', message);

       activeUsers = message.activeUsers;
       if (state.status !== 'loading' && state.status !== 'error') {
           state = {
               ...state,
               activeUsers: activeUsers
           };
           notifyAll();
       }
    }

    function setupSignalRHandlers() {
        deps.connection.onMessage(APPLY_OPERATION_COMMAND, handleReceiveOperation);
        deps.connection.onMessage(PARTY_CHANGED_COMMAND, handlePartyChanged);
        log('SignalR event handlers registered.');
    }

    function teardownSignalRHandlers() {
        deps.connection.offMessage(APPLY_OPERATION_COMMAND, handleReceiveOperation);
        deps.connection.offMessage(PARTY_CHANGED_COMMAND, handlePartyChanged);
        log('SignalR event handlers unregistered.');
    }

    return {
        async loadDocument(documentId: string) {
            log('[DocumentService] Loading document', documentId);
            try {
                const doc = await deps.httpClient.getDocument(documentId);
                state = {
                    status: 'synced',
                    document: doc,
                    serverDocument: doc,
                    activeUsers: []
                };

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

                state = {
                    status: 'error',
                    error: new Error(errorMessage)
                };

                notifyAll();
            }
        },
        async applyLocalEdit(operation: Operation) {
            log('[DocumentService] Applying local edit', operation);
            if (state.status !== 'synced' && state.status !== 'optimistic') {
                log('[DocumentService] Cannot apply local edit. Document not in a valid state.', state);
                return;
            }

            const currentDoc = state.status === 'optimistic' ? state.document : state.serverDocument;
            pendingOperations.push(operation);

            const serverDoc = state.status === 'synced' ? state.document : state.serverDocument;

            state = {
                status: 'optimistic',
                document: applyOperation(currentDoc, operation),
                serverDocument: serverDoc,
                pendingOperation: pendingOperations[0],
                activeUsers: activeUsers
            };
            notifyAll();

            try {
                await deps.connection.sendMessage(APPLY_OPERATION_COMMAND, operation);
                log('[DocumentService] Successfully sent operation to server', operation);
            } catch (error) {
                log('[DocumentService] Error sending operation to server:', error);

                pendingOperations = pendingOperations.filter(op => op !== operation);

                if (pendingOperations.length === 0) {
                    state = {
                        status: 'synced',
                        document: serverDoc,
                        serverDocument: serverDoc,
                        activeUsers
                    };
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
            listener(state);

            return () => {
                listeners.delete(listener);
            };
        },
        async cleanup() {
            log('[DocumentService] Cleaning up');
            teardownSignalRHandlers();
            if (state.status !== 'loading' && state.status !== 'error') {
                try {
                    if (deps.connection.isConnected()) {
                        console.log('[DocumentService] Leaving document group:', state.document.id);
                        await deps.connection.sendMessage(LEAVE_DOCUMENT_GROUP_COMMAND, state.document.id);
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
        getState: () => state,
        getPendingOperations: () => [...pendingOperations]
    };
}