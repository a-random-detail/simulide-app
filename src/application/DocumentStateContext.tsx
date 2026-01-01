import {createContext, useContext} from "react";
import {DocumentState} from "../core/document/types.ts";

export const DocumentStateContext = createContext<DocumentState | undefined>(undefined);


export function useDocumentState() {
    const ctx = useContext(DocumentStateContext);
    if (!ctx) {
        throw new Error("useDocumentState must be used within a DocumentStateProvider");
    }
    return ctx;
}