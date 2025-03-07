import * as signalR from "@microsoft/signalr";
import { API_BASE } from "./service-constants";

const SIGNALR_URL = `${API_BASE}/collaboration`;

export interface Operation {
  documentId: string;
  type: "insert" | "delete";
  position: number;
  length: number;
}

class OperationService {
  private connection: signalR.HubConnection;

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_URL, {
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();
  }

  async startConnection() {
    try {
      await this.connection.start();
      console.log("Connected to SignalR WebSocket");
    } catch (error) {
      console.error("SignalR Connection Error:", error);
      setTimeout(this.startConnection, 5000);
    }
  }

  async joinDocumentGroup(documentId: string) {
    if (this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("JoinDocumentGroup", documentId);
      console.log(`Joined document group: ${documentId}`);
    } else {
      console.warn("Cannot join document group. SignalR not connected.");
    }
  }

  async applyOperation(operation: Operation) {
    if (this.connection.state === signalR.HubConnectionState.Connected) {
      this.connection.send("ApplyOperation", operation);
    } else {
      console.warn("SignalR not connected. Operation not sent.");
    }
  }

  async leaveDocumentGroup(documentId: string) {
    if (this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("LeaveDocumentGroup", documentId);
      console.log(`Left document group: ${documentId}`);
    }
  }

  async closeConnection() {
    try {
      await this.connection.stop();
      console.log("SignalR Disconnected.");
  } catch (err) {
      console.error("SignalR Disconnection Error: ", err);
  }
  }
}

export const operationService = new OperationService();
