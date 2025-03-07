import './App.css'
import { CodeEditor } from './code-editor/CodeEditor';
import { DocumentProvider } from './context/DocumentContext';

function App() {
  return (
    <>
        <DocumentProvider>
            <CodeEditor />
        </DocumentProvider>
    </>
  )
}

export default App
