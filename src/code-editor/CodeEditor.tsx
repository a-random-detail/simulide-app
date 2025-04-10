import { useRef } from "react";
import { useDocumentContext } from "../context/DocumentContext";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';


export const CodeEditor = () => {

    const { documentId, content, initializeDocument, handleDocumentChange, users} = useDocumentContext();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleDocumentChange(event.target.value);
    };

    return (
        <div className="flex flex-row p-10">
            <div className="flex flex-col p-5 min-w-64 bg-amber-500">
                <h3 className="text-2xl">Users:</h3>
                <ul className="list-inside">
                    {[...users].map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
            <div className="flex flex-col w-full p-5 bg-blue-400">
                <h2 className="text-4xl">
                    {!documentId
                        ? <button onClick={initializeDocument}>New Document</button>
                        : documentId
                    }
                </h2>
                <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={() => textareaRef.current?.focus()}
                    onClick={() => textareaRef.current?.focus()}
                    className="w-full h-screen relative flex flex-col" data-testid="code-editor">

            <textarea
                ref={textareaRef}
                className="absolute inset-2 resize-none bg-transparent p-5 px-10 font-mono text-transparent caret-white outline-none"
                value={content}
                onChange={handleContentChange}
            />
                <SyntaxHighlighter
                    language="javascript"
                    showLineNumbers={true}
                    startingLineNumber={1}
                    style={dark}
                    customStyle={{ flex: '1', background: 'transparent'}}
                    className="resize-none p-5 px-10 font-mono"
                >
                    {content}
                </SyntaxHighlighter>

            </div>
            </div>
        </div>
    );
}