import {useCallback, useEffect, useRef, useState} from "react";
import {DocumentState, Operation} from "../../core/document/types.ts";
import {documentService} from "../services/documentService.ts";
import {createDocumentHttpClient} from "../services/documentHttpClient.ts";
import {API_BASE, DELETE_OPERATION_TYPE, INSERT_OPERATION_TYPE} from "../services/service-constants.ts";
import {createSignalRConnection} from "../../infrastructure/websockets/signalRConnection.ts";
import useDebounceCallback from "./use-debounce.ts";

export type CollaborativeDocument = {
    documentId: string;
    state: DocumentState;
    connectionId: string | null;
    localContent: string;
    setLocalContent: (content: string) => void;
    applyEdit: (newContent: string) => void;
    flush: () => void;
    resyncDocument: () => void;
};

export function useCollaborativeDocument(documentId: string): CollaborativeDocument {
    const [state, setState] = useState<DocumentState>({ status: 'loading' });
    const stateRef = useRef(state);
    stateRef.current = state;

    const [localContent, setLocalContent] = useState<string>('');
    const [connectionId, setConnectionId] = useState<string | null>(null);

    const lastSentContentRef = useRef<string>('');
    const lastSentVersionRef = useRef<number>(0);
    let cleanupFn: (() => void) | null = null;

    const sendOperation = useCallback(async () => {
        if (!serviceRef.current) {
            console.warn('[useCollaborativeDocument] No document service available to send operation');
            return;
        }

        if (localContent === lastSentContentRef.current) {
            console.log('[useCollaborativeDocument] No changes to send to server');
            return;
        }

        if (stateRef.current.status !== 'synced' && stateRef.current.status !== 'optimistic') {
            console.log('[useCollaborativeDocument] Document is not in a state to send operations:', stateRef.current.status);
            return;
        }

        const op = calculateOperation(stateRef.current.document.id, lastSentContentRef.current, localContent, lastSentVersionRef.current);
        if (op) {
            console.log('[useCollaborativeDocument] Sending operation to server:', op);
            await serviceRef.current.applyLocalEdit(op);
        }

        lastSentContentRef.current = localContent;
    }, [localContent, state]);

    const serviceRef = useRef<ReturnType<typeof documentService> | null>(null);

    const { schedule, flush, cancel } = useDebounceCallback(sendOperation, 500);

    useEffect(() => {
        console.log('[useCollaborativeDocument] Setting up document service for documentId:', documentId);

        const setup = async () => {
            const httpClient = createDocumentHttpClient(API_BASE);
            const connection = createSignalRConnection(`${API_BASE}/collaboration`);

            const service = documentService({
                connection,
                httpClient,
                get state() { return stateRef.current },
            });

            setConnectionId(connection.getConnectionId());
            serviceRef.current = service;

            const unsubscribe = service.subscribe(setState);
            console.log('[useCollaborativeDocument] Loading document:', documentId);
            await service.loadDocument(documentId);
            console.log('[useCollaborativeDocument] Document loaded and service setup complete');

            return () => {
                console.log('[useCollaborativeDocument] Unsubscribing from document service');
                unsubscribe();
                service.cleanup();
            };
        };

        setup().then(cleanup => {
            console.log('[useCollaborativeDocument] Document service setup complete');
            if (cleanup) cleanupFn = cleanup;
        }).catch((e) => {
            console.error('[useCollaborativeDocument] Error setting up document service:', e);
            setState({ status: 'error', error: e as Error });
        });

        return () => {
            console.log('[useCollaborativeDocument] Cleaning up document service');
            if (cleanupFn) cleanupFn();
        };
    }, [documentId]);

    useEffect(() => {
        if (stateRef.current.status === 'synced' && stateRef.current.document.version !== lastSentVersionRef.current) {
            lastSentContentRef.current = stateRef.current.document.content;
            lastSentVersionRef.current = stateRef.current.document.version;
            setLocalContent(stateRef.current.document.content);
            cancel();
        }
    }, [state, cancel]);

    const applyEdit = useCallback((newContent: string) => {
        console.log('[useCollaborativeDocument] Applying local edit', newContent);
        if (newContent !== localContent) {
            setLocalContent(newContent);
            schedule();
        }
        console.log('[useCollaborativeDocument] Local edit applied');
    }, [schedule]);

    const resyncDocument = useCallback(() => {
        console.log('[useCollaborativeDocument] Resyncing document with server');
        serviceRef.current?.resyncDocument();
        console.log('[useCollaborativeDocument] Document resync requested');
    }, []);

    return {
        documentId,
        state,
        connectionId,
        applyEdit,
        resyncDocument,
        localContent,
        setLocalContent,
        flush
    };
}

function calculateOperation(
    documentId: string,
    oldContent: string,
    newContent: string,
    version: number): Operation | null {
    let position = 0;
    while (
        position < oldContent.length &&
        position < newContent.length &&
        oldContent[position] === newContent[position]
        ) {
        position++;
    }

    if (newContent.length > oldContent.length) {
        const insertedText = newContent.slice(position, newContent.length - (oldContent.length - position));
        return {
            documentId: documentId,
            type: INSERT_OPERATION_TYPE,
            content: insertedText,
            position,
            version: version,
            length: insertedText.length
        };
    }

    if (newContent.length < oldContent.length) {
        const deleteLength = oldContent.length - newContent.length;
        return {
            documentId: documentId,
            type: DELETE_OPERATION_TYPE,
            position,
            length: deleteLength,
            version: version,
        };
    }

    return null;
}
