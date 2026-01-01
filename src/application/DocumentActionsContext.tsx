import {createContext, useContext} from "react";


export const DocumentActionsContext = createContext<
    {
        applyEdit: (content: string) => void;
        flush: () => void;
        resyncDocument: () => void;
    }>(
    {
        applyEdit: () =>  {},
        flush: () => {},
        resyncDocument: () => {}
    });

export function useDocumentActions() {
    return useContext(DocumentActionsContext);
}