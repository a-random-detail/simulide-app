import './App.css'
import { CodeEditor } from './code-editor/CodeEditor';
import { DocumentProvider } from './context/DocumentContext';
import {Route, Routes} from "react-router";


const routes = [
    {
        paths: ["/","document/:id"],
        element: <CodeEditor />,
        needsDocumentProvider: true,
    },
];
function App() {
    return (
        <>
            <Routes>
                {routes.map((route) =>
                    route.paths.map((path) => (
                    <Route
                        key={path}
                        path={path}
                        element={ route.needsDocumentProvider ?
                            <DocumentProvider>{route.element}</DocumentProvider>
                            : route.element } />
                )))}
            </Routes>
        </>
    )
}

export default App
