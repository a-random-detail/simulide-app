import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Operation, operationService } from "../services/operationService";
import { createDocument, DocumentPayload } from "../services/documentService";
import useDebounce from "../hooks/use-debounce";

interface DocumentContextType {
    documentId: string | null;
    content: string;
    initializeDocument: () => void;
    handleDocumentChange: (newText: string, position: number, type: "insert" | "delete") => void;
}

const CollabDocumentContext = createContext<DocumentContextType>({} as DocumentContextType);

interface DocumentProviderProps {
    children: ReactNode;
}

export const DocumentProvider = ({ children = null }: DocumentProviderProps): JSX.Element => {
    const [documentId, setDocumentId] = useState<string | null>("doc-id-here");
    const [content, setContent] = useState<string>("Hello, world!");
    const [pendingOperation, setPendingOperation] = useState<Operation | null>(null);

    useEffect(() => {
        operationService.startConnection();
        return () => {
            operationService.closeConnection();
        };
    }, []);

    const initializeDocument = useCallback(async () => {
        try {
            const docPayload: DocumentPayload = {
                name: "Untitled Document",
                content: content,
            };
            const doc = await createDocument(docPayload);
            setDocumentId(doc.id);
            // await operationService.joinDocumentGroup(doc.id);
        } catch (error) {
            console.error("Error creating document:", error);
        }
    }, []);

    const handleDocumentChange = useCallback((newText: string, position: number, type: "insert" | "delete") => {
        setContent(newText);
        if (documentId) {
            const length = type === "insert" ? newText.length - content.length : content.length - newText.length;
            setPendingOperation({ documentId, type, position, length });
        }
    }, [documentId, content]);

    useDebounce(() => {
        if (pendingOperation) {
            operationService.applyOperation(pendingOperation);
            setPendingOperation(null);
        }
    }, 500, [pendingOperation]);

    useEffect(() => {
        return () => {
            if (documentId) {
                operationService.leaveDocumentGroup(documentId);
            }
        };
    }, [documentId]);

    const contextValue: DocumentContextType = {
        documentId,
        content,
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
