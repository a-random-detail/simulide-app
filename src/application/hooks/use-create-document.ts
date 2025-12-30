import {useState} from "react";
import {createDocumentHttpClient} from "../services/documentHttpClient.ts";
import {API_BASE} from "../services/service-constants.ts";
import { Document } from "../../core/document/types.ts";


export function useCreateDocument() {
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const createDocument = async (name?: string, initialContent?: string): Promise<Document | null> => {
        setIsCreating(true);
        setError(null);

        try {
            const httpClient = createDocumentHttpClient(API_BASE);
            const document = await httpClient.createDocument({name: name ?? "", content: initialContent ?? ""});

            console.log('[useCreateDocument] Document created successfully:', document);

            return document;
        } catch (err) {
            const error = err as Error;
            setError(error);
            console.error('[useCreateDocument] Error creating document:', error);
            return null;
        } finally {
            setIsCreating(false);
        }
    };

    return {
        createDocument,
        isCreating,
        error
    };
}