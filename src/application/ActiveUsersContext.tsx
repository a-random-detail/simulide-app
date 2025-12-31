import {createContext, useContext} from "react";
import {ActiveUser} from "../core/document/types.ts";

export const ActiveUsersContext = createContext<ActiveUser[]>([]);

export function useActiveUsers() {
    return useContext(ActiveUsersContext);
}