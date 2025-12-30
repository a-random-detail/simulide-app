export type OperationType = "insert" | "delete";

export interface Document {
    id: string;
    name: string;
    content: string;
    version: number;
}

export interface Operation {
    documentId: string;
    type: OperationType;
    content?: string;
    position: number;
    length?: number;
    version: number;
    userId?: string;
}

export interface ActiveUser {
    userId: string;
    cursorPosition?: number;
}

export type DocumentState =
    { status: 'loading' }
    | { status: 'synced'; document: Document, serverDocument: Document, activeUsers: ActiveUser[] }
    | { status: 'optimistic'; document: Document; serverDocument: Document, pendingOperation: Operation, activeUsers: ActiveUser[] }
    | { status: 'syncing', document: Document, activeUsers: ActiveUser[] }
    | { status: 'error'; error: Error };
