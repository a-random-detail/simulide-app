import { DocumentProvider } from "../context/DocumentContext.tsx";
import {CodeEditor} from "./CodeEditor.tsx";


export const CodeEditorWrapper = () => {

    return (
        <DocumentProvider>
            <CodeEditor />
        </DocumentProvider>
    );
};