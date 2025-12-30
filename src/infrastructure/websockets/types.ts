import {RetryContext} from "@microsoft/signalr";

export interface PartyChangedMessage {
    userId: string;
    action: 'joined' | 'left';
    activeUsers: Array<{
        userId: string;
        cursorPosition: number;
    }>
}
export interface WebSocketConnection {
    connect(): void;
    disconnect(): void;
    sendMessage(method: string, ...args: any[]): void;
    onMessage(method: string, handler: (...args: any[]) => void): void;
    offMessage(method: string, handler: (...args: any[]) => void): void;
    getState(): 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
    getConnectionId(): string | null;
}

import * as signalR from '@microsoft/signalr';

export function createSignalRConnection(hubUrl: string): WebSocketConnection {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds(retryContext: RetryContext): number | null {
                switch (retryContext.previousRetryCount) {
                    case 0: return 0;
                    case 1: return 2000;
                    case 2: return 10000;
                    default: return 3000;
                }
            }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

    const handlers = new Map<string, Set<Function>>();

    return {
        async connect() {
            if (connection.state === signalR.HubConnectionState.Disconnected) {
                await connection.start();
            }
        },

        async disconnect() {
           if (connection.state !== signalR.HubConnectionState.Disconnected) {
                await connection.stop();
           }
        },

        sendMessage(method: string, ...args: any[]) {
            connection.invoke(method, ...args).catch(err => console.error(`Error invoking ${method}:`, err));
        },

        onMessage(method: string, handler: (...args: any[]) => void) {
            connection.on(method, handler);
            if (!handlers.has(method)) {
               handlers.set(method, new Set());
            }
            handlers.get(method)!.add(handler);
        },

        offMessage(method: string, handler: (...args: any[]) => void) {
            connection.off(method, handler);

            const methodHandlers = handlers.get(method);
            if (methodHandlers) methodHandlers.delete(handler);
        },

        getState() {
            switch (connection.state) {
                case signalR.HubConnectionState.Connected:
                    return 'connected';
                case signalR.HubConnectionState.Disconnected:
                    return 'disconnected';
                case signalR.HubConnectionState.Connecting:
                    return 'connecting';
                case signalR.HubConnectionState.Reconnecting:
                    return 'reconnecting';
                default:
                    return 'disconnected';
            }
        },

        getConnectionId(): string | null {
            return connection.connectionId;
        }
    };
}