import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { createDocument, DocumentPayload, DocumentResponse } from "../services/documentService";
import useDebounce from "../hooks/use-debounce";
import { CodeOperation, OperationGist } from "../types/CodeOperation";
import OperationService from "../services/operationService";
import { CodeDocument } from "../types/CodeDocument";

interface DocumentContextType {
    documentId: string | null;
    content: string;
    initializeDocument: () => void;
    handleDocumentChange: (newText: string) => void;
}

const CollabDocumentContext = createContext<DocumentContextType>({} as DocumentContextType);

interface DocumentProviderProps {
    children: ReactNode;
}

export const DocumentProvider = ({ children = null }: DocumentProviderProps): JSX.Element => {
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [oldContent, setOldContent] = useState<string | null>(null);
    const [newContent, setNewContent] = useState<string>("");
    const [version, setVersion] = useState<number>(0);
    const [users, setUsers] = useState<string[]>([]);

    const operationService = OperationService;

    useEffect(() => {
        if (!documentId) return;
        operationService.joinDocumentGroup(documentId).catch((err) => console.error(`Unable to join document group ${documentId}`, err));
    }, [documentId]);

    const initializeDocument = useCallback(async () => {
        try {
            const docPayload: DocumentPayload = {
                name: "Untitled Document",
                content: newContent,
            };
            const doc = await createDocument(docPayload);
            if (!doc.isSuccessful) {
                console.error("Error(s) while creating document", doc.errors);
                return;
            }
            const docResponse = doc.data as DocumentResponse; 
            setDocumentId(docResponse.id);
            setOldContent(docResponse.content ?? null);
            setVersion(docResponse.version);
            
        } catch (error) {
            console.error("Error creating document:", error);
        }
    }, []);

    const computeTextDiff = (oldText: string, newText: string): OperationGist => {
        let start = 0;

        while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) 
            start++;

        let endOld = oldText.length-1;
        let endNew = newText.length-1;

        while (endOld >= start && endNew >= start && oldText[endOld] === newText[endNew]) {
            endOld--;
            endNew--;
        }

        const deleted = oldText.slice(start, endOld+1);
        const inserted = newText.slice(start, endNew+1);

        return {
            position: start,
            type: inserted.length > 0 ? 'insert' : 'delete',
            content: inserted,
            length: inserted.length > 0 ? inserted.length : deleted.length
        };
    };

    const handleDocumentChange = useCallback((newText: string) => {
        setNewContent(newText);
    }, [newContent]);


    useDebounce(() => {
        if (documentId) {
            const diff = computeTextDiff(oldContent ?? "", newContent);
            operationService.applyOperation({ documentId, ...diff, version});
            setOldContent(newContent);
        }
    }, 5000, [newContent]);

    // useEffect(() => {
        // return () => {
            // if (documentId) {
                // leaveDocumentGroup(documentId);
            // }
        // };
    // }, [documentId]);

    const contextValue: DocumentContextType = {
        documentId,
        content: newContent,
        initializeDocument,
        handleDocumentChange,
    };

    return (
        <CollabDocumentContext.Provider value={contextValue}>
            {children && children}
        </CollabDocumentContext.Provider>
    );
};

export const useDocumentContext = (): DocumentContextType => {
    const context = useContext(CollabDocumentContext);
    if (!context) {
        throw new Error("useDocumentContext must be used within a <DocumentProvider>");
    }
    return context;
};
