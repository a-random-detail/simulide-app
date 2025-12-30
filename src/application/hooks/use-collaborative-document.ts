import {useCallback, useEffect, useRef, useState} from "react";
import {DocumentState, Operation} from "../../core/document/types.ts";
import {documentService} from "../services/documentService.ts";
import {createDocumentHttpClient} from "../services/documentHttpClient.ts";
import {API_BASE} from "../services/service-constants.ts";
import {createSignalRConnection} from "../../infrastructure/websockets/types.ts";

export function useCollaborativeDocument(documentId: string) {
    const [state, setState] = useState<DocumentState>({ status: 'loading' });

    const serviceRef = useRef<ReturnType<typeof documentService> | null>(null);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        let service: ReturnType<typeof documentService> | undefined;

        const setup = async () => {
            const httpClient = createDocumentHttpClient(API_BASE);
            const connection = createSignalRConnection(`${API_BASE}/collaboration`);

            service = documentService({connection, httpClient});
            serviceRef.current = service;

            unsubscribe = service.subscribe(setState);
            await service.loadDocument(documentId);
        };

        setup().catch((e) => {
            console.error('[useCollaborativeDocument] Error setting up document service:', e);
            setState({ status: 'error', error: e as Error });
        });

        return () => {
            console.log('[useCollaborativeDocument] Unsubscribing from document service');
            if (unsubscribe) unsubscribe();
            if (service) service.cleanup().catch((e) => {
                console.error('[useCollaborativeDocument] Error during service cleanup:', e);
            });
        };
    }, [documentId]);

    const applyEdit = useCallback((op: Operation) => {
        serviceRef.current?.applyLocalEdit(op);
    }, []);

    const resyncDocument = useCallback(() => {
        serviceRef.current?.resyncDocument();
    }, []);

    return {state, applyEdit, resyncDocument};
}