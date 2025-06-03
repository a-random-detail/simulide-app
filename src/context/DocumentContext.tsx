import {createContext, useContext, useState, useEffect, useCallback, ReactNode} from "react";
import { createDocument, DocumentPayload, DocumentResponse } from "../services/documentService";
import useDebounce from "../hooks/use-debounce";
import { CodeOperation, OperationGist } from "../types/CodeOperation";
import OperationService from "../services/operationService";
import {ActionType, PartyChangeEvent} from "../types/PartyChangedEvent";
import {useParams} from "react-router";

interface DocumentContextType {
    documentId: string | null;
    content: string;
    users: Set<string>;
    initializeDocument: () => void;
    handleDocumentChange: (newText: string) => void;
}

const CollabDocumentContext = createContext<DocumentContextType>({} as DocumentContextType);

interface DocumentProviderProps {
    children: ReactNode;
}

export const DocumentProvider = ({ children }: DocumentProviderProps): JSX.Element => {

    const { id } = useParams<{ id?: string }>();
    const operationService  = OperationService;
    const [documentId, setDocumentId] = useState<string | null>(id ?? null);
    const [oldContent, setOldContent] = useState<string | null>(null);
    const [newContent, setNewContent] = useState<string>("");
    const [version, setVersion] = useState<number>(0);
    const [users, setUsers] = useState<Set<string>>(new Set<string>());

    const handleReceiveOperation = (operation: CodeOperation) => { 
        console.log("operation received (in provider):", operation);
        if (!documentId) return;
        if (operation.documentId !== documentId) return;

        const { position, type, content } = operation as OperationGist;
        let updatedContent = newContent;
        let contentLength = content?.length ?? 0;

        if (type === "insert") {
            updatedContent = updatedContent.slice(0, position) + content + updatedContent.slice(position);
        } else if (type === "delete" && contentLength > 0) {
            updatedContent = updatedContent.slice(0, position) + updatedContent.slice(position + contentLength);
        }

        setNewContent(updatedContent);
    };

    const handlePartyChange = (partyChange: PartyChangeEvent) => {
        console.log("party changed (in provider):", partyChange);
        updateUserList(partyChange);
    };

    const updateUserList = (partyChange: PartyChangeEvent ) => {
        setUsers((prevUsers => {
            const updatedUsers = new Set(prevUsers);
            if (partyChange.action === ActionType.Join) {
                updatedUsers.add(partyChange.connectionId);
            } else if (partyChange.action === ActionType.Leave) {
                updatedUsers.delete(partyChange.connectionId);
            }
            return updatedUsers;
        }
        ));
        console.log("user list:", Array.from(users).join(", "));
    };

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
        console.log("handleDocumentChange", newText);
        setNewContent(newText);
    }, [newContent]);

    useEffect(() => {
        if (!operationService) return;
        operationService.receiveOperation?.(handleReceiveOperation);
        operationService.partyChanged?.(handlePartyChange);
    }, []);

    useEffect(() => {
        if (!documentId) return;
        operationService.joinDocumentGroup(documentId).catch((err: any) => console.error(`Unable to join document group ${documentId}`, err));
    }, [documentId]);

    useDebounce(async () => {
        if (documentId) {
            const diff = computeTextDiff(oldContent ?? "", newContent);
            await operationService.applyOperation({ documentId, ...diff, version});
            setOldContent(newContent);
        }
    }, 1000, [newContent]);

    const contextValue: DocumentContextType = {
        documentId,
        content: newContent,
        initializeDocument,
        handleDocumentChange,
        users: users
    };

    return (
        <CollabDocumentContext.Provider value={contextValue}>
            {children && children}
        </CollabDocumentContext.Provider>
    );
};

export function useDocumentContext(): DocumentContextType {
    const context = useContext(CollabDocumentContext);
    if (!context) {
        throw new Error("useDocumentContext must be used within a <DocumentProvider>");
    }
    return context;
};
