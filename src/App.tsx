import './App.css'
import {Route, Routes} from "react-router";
import {HomePage} from "./ui/pages/HomePage.tsx";
import {DocumentPage} from "./ui/pages/DocumentPage.tsx";
import {DocumentStateProvider} from "./application/DocumentStateProvider.tsx";


const routes = [
    {
        paths: ["/"],
        element: <HomePage />
    },
    {
        paths: ["/documents/:documentId"],
        element: (
            <DocumentStateProvider>
                <DocumentPage />)
            </DocumentStateProvider>
        )
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
                        element={route.element} />
                )))}
            </Routes>
        </>
    )
}

export default App
