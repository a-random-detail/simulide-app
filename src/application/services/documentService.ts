import {DocumentState, Operation, ActiveUser} from "../../core/document/types.ts";
import {WebSocketConnection, PartyChangedMessage} from "../../infrastructure/websockets/types.ts";
import {applyOperation} from "../../core/document/operations.ts";
import {DocumentHttpClient} from "./documentHttpClient.ts";
import {
    APPLY_OPERATION_COMMAND,
    DELETE_OPERATION_TYPE,
    INSERT_OPERATION_TYPE,
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
        if (deps.state.status === 'loading' || deps.state.status === 'error') {
            return;
        }

        const documentId = deps.state.document.id;
        const savedPendingOps = [...pendingOperations];

        log('[DocumentService] Starting re-sync');

        updateState({
            status: 'syncing',
            document: deps.state.document,
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
                    activeUsers: deps.state.activeUsers
                });
            } else {
                updateState({
                    status: 'synced',
                    document: reconciledDocument,
                    serverDocument: syncedDoc,
                    activeUsers: deps.state.activeUsers
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
        const myConnectionId = deps.connection.getConnectionId();
        log('[DocumentService] ReceiveOperation', {
            operationId: operation.id,
            operation,
            currentState: deps.state.status,
            currentVersion: deps.state.status !== 'loading' && deps.state.status !== 'error' ? deps.state.document.version : 'N/A',
            isOwnOperation: operation.userId === myConnectionId,
            connectionId: operation.userId,
            myConnectionId
        });

        if (deps.state.status === 'error' || deps.state.status === 'loading') {
            log('[DocumentService] Ignoring operation. Document in invalid state.', deps.state);
            return;
        }

        if (deps.state.status === 'optimistic') {
            log('[DocumentService] Received operation while in optimistic state. Transitioning to syncing state.');
            // resyncDocument();
            return;
        }

        if (deps.state.status === 'synced') {
            const currentVersion = deps.state.document.version;

            if (operation.version === currentVersion + 1) {
                log('[DocumentService] Applying operation to synced document in order');

                try {
                    const newDoc = applyOperation(deps.state.document, operation);
                    updateState({
                        status: 'synced',
                        document: newDoc,
                        serverDocument: newDoc,
                        activeUsers: deps.state.activeUsers
                    });
                    return;
                } catch (error) {
                    log('[DocumentService] Error applying operation:', error);
                    // resyncDocument();
                    return;
                }
            }

            if (operation.version > currentVersion + 1) {
                log('[DocumentService] Operation version too far ahead to be valid.', {
                    received: operation.version,
                    current: currentVersion,
                    gap: operation.version - currentVersion
                });
                // resyncDocument();
                return;
            }
            if (operation.version <= currentVersion) {
                console.warn('[DocumentService] Received out-of-order operation. Ignoring.', {
                    received: operation.version,
                    current: currentVersion
                });
                return;
            }

        }

        if (deps.state.status === 'syncing') {
            console.log('[DocumentService] Ignoring operation while syncing');
            return;
        }
    }

    function handlePartyChanged(message: PartyChangedMessage) {
       log('PartyChanged', {
           ...message,
           action: message.action,
       });

       activeUsers = message.activeUsers;
       if (deps.state.status !== 'loading' && deps.state.status !== 'error') {
           updateState({
               ...deps.state,
               activeUsers: activeUsers
           });
           notifyAll();
       }
    }

    function setupSignalRHandlers() {
        deps.connection.onMessage(PARTY_CHANGED_COMMAND, handlePartyChanged);
        deps.connection.onMessage(RECEIVE_OPERATION_COMMAND, handleReceiveOperation);
        deps.connection.onMessage(RECEIVE_OPERATION_COMMAND, (op: any) => {
            console.log("[ReceiveOperation] raw:", op);

            const type =
                typeof op.type === "string"
                    ? op.type.toLowerCase()
                    : op.type === 0
                        ? INSERT_OPERATION_TYPE
                        : op.type === 1
                            ? DELETE_OPERATION_TYPE
                            : "none";

            const normalized = { ...op, type };

            console.log("[ReceiveOperation] normalized:", normalized);

            // then dispatch/apply it
        });
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
            if (deps.state.status !== 'synced' && deps.state.status !== 'optimistic') {
                log('[DocumentService] Cannot apply local edit. Document not in a valid state.', deps.state);
                return;
            }

            const currentDoc = deps.state.document;
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
                serverDocument: deps.state.serverDocument,
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
                        document: deps.state.serverDocument,
                        serverDocument: deps.state.serverDocument,
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
            if (deps.state.status !== 'loading' && deps.state.status !== 'error') {
                try {
                    if (deps.connection.isConnected()) {
                        console.log('[DocumentService] Leaving document group:', deps.state.document.id);
                        await deps.connection.sendMessage(LEAVE_DOCUMENT_GROUP_COMMAND, deps.state.document.id);
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
        getState: () => deps.state,
        getPendingOperations: () => [...pendingOperations]
    };
}