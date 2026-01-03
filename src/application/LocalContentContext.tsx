import {createContext} from "react";

export const LocalContentContext = createContext<
    {
        localContent: string,
        setLocalContent: (content: string) => void
    }>({
    localContent: "",
    setLocalContent: () => {}
});

export function useLocalContent() {
    return LocalContentContext;
}