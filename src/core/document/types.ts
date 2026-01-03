import { INSERT_OPERATION_TYPE, DELETE_OPERATION_TYPE } from '../../application/services/service-constants';

export type OperationType = typeof INSERT_OPERATION_TYPE | typeof DELETE_OPERATION_TYPE;

export interface Document {
    id: string;
    name: string;
    content: string;
    version: number;
}

export interface Operation {
    id?: string;
    documentId: string;
    type: OperationType;
    position: number;
    content?: string;
    version: number;
    length?: number;
    userId?: string;
    createdAt?: string;
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
