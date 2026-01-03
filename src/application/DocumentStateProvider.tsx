import {createContext, ReactNode, useContext} from "react";
import {CollaborativeDocument, useCollaborativeDocument} from "./hooks/use-collaborative-document.ts";
import { DocumentStateContext } from "./DocumentStateContext.tsx";
import {useParams} from "react-router";

export const DocumentContext = createContext<CollaborativeDocument | undefined>(undefined);

export function DocumentStateProvider({ children }: { children: ReactNode}) {
    const { documentId } = useParams<{ documentId: string }>();
    const doc = useCollaborativeDocument(documentId!);
    return (
        <DocumentContext.Provider value={doc}>
            <DocumentStateContext.Provider value={doc.state}>
                {children}
            </DocumentStateContext.Provider>
        </DocumentContext.Provider>
    );
}

export function useDocument(): CollaborativeDocument {
    const ctx = useContext(DocumentContext);
    if (!ctx) {
        throw new Error("useDocument must be used within a DocumentStateProvider");
    }
    return ctx;
}