import {createContext, useContext} from "react";

export const ConnectionIdContext = createContext<string>('');

export function useConnectionId() {
    return useContext(ConnectionIdContext);
}