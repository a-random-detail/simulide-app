import {useNavigate} from "react-router";
import {Editor} from "../components/editor/Editor.tsx";
import {EditorHeader} from "../components/editor/EditorHeader.tsx";
import {ActiveUsers} from "../components/active-users/ActiveUsers.tsx";
import { ActiveUsersContext } from "../../application/ActiveUsersContext.tsx";
import { DocumentStateContext, useDocumentState } from "../../application/DocumentStateContext.tsx";
import {LocalContentContext} from "../../application/LocalContentContext.tsx";
import {DocumentActionsContext} from "../../application/DocumentActionsContext.tsx";
import {useDocument} from "../../application/DocumentStateProvider.tsx";
import { useEffect } from "react";

export function DocumentPage() {
    const state = useDocumentState();
    const {
        documentId,
        connectionId,
        localContent,
        setLocalContent,
        applyEdit,
        flush,
        resyncDocument,
    } = useDocument();
    const navigate = useNavigate();

    console.log('[DocumentPage] Current document state:', state, documentId);

    useEffect(() => {
        if (state.status === 'loading' || state.status === 'error')
            return;

        console.log('[DocumentPage] (effect) Document version changed:', state.document?.version);
    }, [state]);

    useEffect(() => {
        console.log('[DocumentPage] State after edit:', state);
    }, [state]);

    if (state.status === 'loading') {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="text-lg text-gray-600"> Loading document... </div>
            </div>
        );
    }

    if (state.status === 'error') {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
                <div className="text-lg text-red-600 mb-4"> Error loading document: {state.error.message} </div>
                <button
                    onClick={() => navigate('/')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                    Go to Home
                </button>
            </div>
        );
    }

    return (
        <LocalContentContext.Provider value={{localContent, setLocalContent}}>
            <DocumentActionsContext.Provider value={{applyEdit, flush, resyncDocument}}>
                <DocumentStateContext.Provider value={state}>
                    <ActiveUsersContext.Provider value={state.activeUsers ?? []}>
                        <div className="flex flex-col h-screen bg-gray-100">
                            <EditorHeader onResync={resyncDocument} />
                            {state.status === 'syncing' && <div>Syncing changes...</div>}

                            <div className="flex-1 flex flex-col overflow-hidden">
                                <ActiveUsers currentConnectionId={connectionId ?? ""}/>
                                <Editor
                                    content={localContent}
                                    onEdit={applyEdit}
                                    onFlush={flush}
                                    disabled={state.status === 'syncing'}
                                    placeholder="Start collaborating..."
                                />
                            </div>
                        </div>
                    </ActiveUsersContext.Provider>
                </DocumentStateContext.Provider>
            </DocumentActionsContext.Provider>
        </LocalContentContext.Provider>
    );
}