import * as signalR from "@microsoft/signalr";
import { API_BASE, PARTY_CHANGED_COMMAND, RECEIVE_OPERATION_COMMAND } from "./service-constants";
import { CodeOperation } from "../types/CodeOperation";
import { PartyChangeEvent } from "../types/PartyChangedEvent";

const SIGNALR_URL = `${API_BASE}/collaboration`;

export type ReceiveOperationFn = (operation: CodeOperation) => void;
export type PartyChangeFn = (partyChange: PartyChangeEvent) => void;

class OperationService {
  private connection: signalR.HubConnection;
  public operationEvent: (onReceiveOperation: ReceiveOperationFn) => void;
  public partyChangeEvent: (onPartyChange: PartyChangeFn) => void; 
  static instance: OperationService;

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_URL, {
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

      this.startConnection().catch(err => console.error("Error while starting connection: ", err));

    this.operationEvent = (onReceiveOperation) =>
      this.connection.on(RECEIVE_OPERATION_COMMAND, (operation: CodeOperation) => console.log("operation received:", operation));

    this.partyChangeEvent = (onPartyChange) =>
      this.connection.on(PARTY_CHANGED_COMMAND, (event: PartyChangeEvent) => console.log("party changed:", event));
  }

  async startConnection() {
    try {
      if (!this.connection) {
        console.error("SignalR connection is undefined.");
        return;
      }
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

  async applyOperation(operation: CodeOperation) {
    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      console.warn("SignalR not connected. Operation not sent.");
      return;
    }
    try {
      await this.connection.send("ApplyOperation", operation);
      console.log("successfully sent the operation to the hub");
    } catch (err) {
      console.error("Operation application failed.", err);
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

  public static getInstance(): OperationService {
    if (!OperationService.instance)
      OperationService.instance = new OperationService();

    return OperationService.instance;
  }

}

export default OperationService.getInstance();

