export type CodeOperation = {
    documentId: string;
    type: OperationType;
    content?: string;
    position: number;
    length?: number;
}

export type OperationType = "delete" | "insert";