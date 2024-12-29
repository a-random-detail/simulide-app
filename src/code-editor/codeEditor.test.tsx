import React from "react";
import {describe, expect, it} from "vitest";
import CodeEditor from "./CodeEditor.tsx";
import {render, screen} from "@testing-library/react";

describe('codeEditor', () => {

    it('should display text area for editing', async () => {

        render(<CodeEditor />);

        const editorElement = screen.getByTestId('code-editor');
        expect(editorElement).toBeDefined();
    });
});