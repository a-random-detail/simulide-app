import {RetryContext} from "@microsoft/signalr";
import * as signalR from '@microsoft/signalr';
import {WebSocketConnection} from "./types.ts";

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
                console.log('[SignalRConnection] Connecting to SignalR hub at', hubUrl);
                await connection.start();
                console.log('[SignalRConnection] Connected to SignalR hub');
            }
        },

        async disconnect() {
           if (connection.state !== signalR.HubConnectionState.Disconnected) {
                console.log('[SignalRConnection] Disconnecting from SignalR hub');
                await connection.stop();
                console.log('[SignalRConnection] Disconnected from SignalR hub');
           }
        },

        async sendMessage(method: string, ...args: any[]) {
            try {
                console.log('[SignalRConnection] Sending message to SignalR hub:', method, args);
                await connection.invoke(method, ...args).catch(err => console.error(`Error invoking ${method}:`, err));
                console.log('[SignalRConnection] Message sent:', method);
            } catch (e) {
                console.error('[SignalRConnection] Error sending message:', e);
                throw e;
            }
        },

        onMessage(method: string, handler: (...args: any[]) => void) {
            console.log('[SignalRConnection] Registering handler for message:', method);
            connection.on(method, handler);
            if (!handlers.has(method)) {
               handlers.set(method, new Set());
            }
            handlers.get(method)!.add(handler);
            console.log('[SignalRConnection] Registered handler for message:', method);
        },

        offMessage(method: string, handler: (...args: any[]) => void) {
            console.log('[SignalRConnection] Unregistering handler for message:', method);
            connection.off(method, handler);

            const methodHandlers = handlers.get(method);
            if (methodHandlers) methodHandlers.delete(handler);
            console.log('[SignalRConnection] Unregistered handler for message:', method);
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
        },

        isConnected(): boolean {
            return connection.state === signalR.HubConnectionState.Connected;
        }
    };
}
