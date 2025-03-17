export type CodeOperation = {
    documentId: string;
    type: OperationType;
    content?: string;
    position: number;
    length?: number;
    version: number;
}

export type OperationType = "delete" | "insert";

export type OperationGist = {
    type: OperationType;
    content?: string;
    position: number;
    length?: number;
};