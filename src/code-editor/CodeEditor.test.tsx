import React from 'react';
import {beforeEach, describe, expect, it, vi } from 'vitest';
import CodeEditor from './CodeEditor.tsx';
import {act, render, screen, waitFor} from '@testing-library/react';
import {CodeDocument} from '../types/CodeDocument.ts';
import useClient from "../hooks/use-client.ts";

vi.mock('../hooks/use-client');

describe('CodeEditor', () => {
    const mockedNewDocFn = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(useClient).mockReturnValue({ createNewDocument: mockedNewDocFn})
    });

    it('should display text area for editing', async () => {
        await act(() => render(<CodeEditor />));

        const editorElement = screen.getByTestId('code-editor');
        expect(editorElement).toBeDefined();
    });

    it('should create document when `Save` button pressed', async () => {
        const expectedResult = {
            id: '8ddeb818-6514-4717-bf8d-2fc6ab0c1984',
            name: 'test 1234',
            content: 'omg my wife just walked by and it was wonderful',
            version: 1
        } as CodeDocument;

        mockedNewDocFn.mockResolvedValue(expectedResult)
        await act(() => render(<CodeEditor />));

        const newDoc = screen.getByTestId('new-document');
        newDoc.click()

        await waitFor(() => {
            const codeEditor = screen.getByTestId('code-editor');

            expect(mockedNewDocFn).toHaveBeenCalled();
            expect(codeEditor.textContent).toContain(expectedResult.content);
        });
    });
});
