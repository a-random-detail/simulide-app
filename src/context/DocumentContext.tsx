import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { createDocument, DocumentPayload } from "../services/documentService";
import useDebounce from "../hooks/use-debounce";
import { CodeOperation } from "../types/CodeOperation";
import OperationService from "../services/operationService";

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
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [content, setContent] = useState<string>("");
    const [pendingOperation, setPendingOperation] = useState<CodeOperation | null>(null);
    const [users, setUsers] = useState<string[]>([]);

    const {joinDocumentGroup, leaveDocumentGroup, applyOperation} = OperationService();



    const initializeDocument = useCallback(async () => {
        try {
            const docPayload: DocumentPayload = {
                name: "Untitled Document",
                content: content,
            };
            const doc = await createDocument(docPayload);
            setDocumentId(doc.data.id);
            await joinDocumentGroup(doc.id).catch(reason => console.log("document group join failed:", reason));
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
    }, [content]);

    useDebounce(() => {
        if (pendingOperation) {
            applyOperation(pendingOperation);
            setPendingOperation(null);
        }
    }, 500, [pendingOperation]);

    // useEffect(() => {
        // return () => {
            // if (documentId) {
                // leaveDocumentGroup(documentId);
            // }
        // };
    // }, [documentId]);

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
