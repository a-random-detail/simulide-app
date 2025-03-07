import { useRef, useState } from "react";
import { useDocumentContext } from "../context/DocumentContext";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';


export const CodeEditor = () => {

    const { documentId, content, initializeDocument, handleDocumentChange} = useDocumentContext();
    const [lastContent, setLastContent] = useState<string>("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = event.target.value;
        const position = event.target.selectionStart;
        const operationType = newContent.length > lastContent.length ? "insert" : "delete";

        handleDocumentChange(newContent, position, operationType);
        setLastContent(newContent);
    };  

    return (
        <>
            <h1> {!documentId && <button onClick={initializeDocument}>New Document</button>} </h1> 
            <div
                role="button"
                tabIndex={0}
                onKeyDown={() => textareaRef.current?.focus()}
                onClick={() => textareaRef.current?.focus()}
                className="w-full h-screen flex flex-col" data-testid="code-editor">

            <textarea
                ref={textareaRef}
                className="absolute inset-0 resize-none bg-transparent p-2 font-mono text-transparent caret-white outline-none"
                value={content}
                onChange={handleContentChange}
            />
            <SyntaxHighlighter
                className="flex-grow w-full h-full resize-none border-none p-4 box-border font-mono text-lg"
                language="javascript"
                showLineNumbers={true}
                startingLineNumber={1}
                style={dark}
                customStyle={{ flex: '1', background: 'transparent'}}
            >
                {content}
            </SyntaxHighlighter>


        </div>
        </>
    );
}