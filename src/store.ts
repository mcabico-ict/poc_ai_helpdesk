

import { Ticket, TicketSeverity, TicketStatus } from "./types";

// The Google Apps Script Web App URL
// IMPORTANT: YOU MUST RE-DEPLOY THE SCRIPT AND UPDATE THIS URL IF YOU MAKE CHANGES TO CODE.GS
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyK33hOecOAcnljL0XCvyELQPzZC7MRwltKjO_k0f93iVaUGNIdSOrmIP_BhiGj84a3gQ/exec";

type Listener = () => void;

class TicketStore {
  private tickets: Ticket[] = [];
  private listeners: Listener[] = [];
  private isLoading: boolean = false;
  private error: string | null = null;
  
  // New state to track the currently identified user (PIN or Email) from the Chat
  private currentUserQuery: string | null = null;

  constructor() {
    this.fetchTickets();
  }

  getTickets(): Ticket[] {
    return this.tickets;
  }

  getTicketById(id: string): Ticket | undefined {
    return this.tickets.find(t => t.id === id);
  }

  setCurrentUserQuery(query: string | null) {
    this.currentUserQuery = query;
    this.notify();
  }

  getCurrentUserQuery(): string | null {
    return this.currentUserQuery;
  }

  searchTickets(query: string): Ticket[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase().trim();
    return this.tickets.filter(t => 
        String(t.pid).toLowerCase().includes(lowerQuery) || 
        (t.employeePin ? String(t.employeePin).toLowerCase().includes(lowerQuery) : false) ||
        (t.requesterEmail ? String(t.requesterEmail).toLowerCase().includes(lowerQuery) : false)
    );
  }

  isSyncing(): boolean {
    return this.isLoading;
  }

  getLastError(): string | null {
    return this.error;
  }

  async fetchTickets() {
    if (!GOOGLE_SCRIPT_URL) {
        console.warn("Google Script URL not set.");
        return;
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      this.tickets = data.map((t: any) => ({
          ...t,
          id: String(t.id),
          pid: String(t.pid),
          employeePin: t.employeePin ? String(t.employeePin) : undefined,
          requesterEmail: t.requesterEmail ? String(t.requesterEmail) : 'N/A',
          techNotes: t.techNotes || undefined,
          immediateSuperior: t.immediateSuperior || undefined,
          superiorContact: t.superiorContact || undefined,
          troubleshootingLog: t.troubleshootingLog || undefined,
          attachmentUrl: t.attachmentUrl || undefined
      })).reverse();
      
    } catch (err) {
      console.error("Failed to fetch tickets", err);
      this.error = "Sync Failed. Please check internet connection.";
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  async updateTicketLog(ticketId: string, textToAppend: string) {
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const formattedLogEntry = `[${timestamp}]: ${textToAppend}`;

    const ticketIndex = this.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex !== -1) {
        const updatedTicket = { ...this.tickets[ticketIndex] };
        updatedTicket.troubleshootingLog = (updatedTicket.troubleshootingLog || "") + `\n${formattedLogEntry}`;
        this.tickets[ticketIndex] = updatedTicket;
        this.notify();
    }

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {},
            body: JSON.stringify({
                action: "updateLog",
                ticketId: ticketId,
                textToAppend: formattedLogEntry, 
            }),
        });
        setTimeout(() => this.fetchTickets(), 3000);
    } catch (err) {
        console.error("Failed to update log in Google Sheet", err);
    }
  }

  async closeTicket(ticketId: string, reason: string) {
      // Optimistic Update
      const ticketIndex = this.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex !== -1) {
          const updatedTicket = { ...this.tickets[ticketIndex] };
          updatedTicket.status = TicketStatus.CLOSED;
          updatedTicket.troubleshootingLog = (updatedTicket.troubleshootingLog || "") + `\n[System]: Closed - ${reason}`;
          this.tickets[ticketIndex] = updatedTicket;
          this.notify();
      }

      try {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: "POST",
              mode: "no-cors",
              headers: {},
              body: JSON.stringify({
                  action: "closeTicket",
                  ticketId: ticketId,
                  reason: reason
              }),
          });
          setTimeout(() => this.fetchTickets(), 3000);
      } catch (err) {
          console.error("Failed to close ticket", err);
      }
  }

  async uploadFile(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
              try {
                  const base64Content = (reader.result as string).split(',')[1];
                  
                  console.log(`Uploading ${file.name} (${file.size} bytes) to GAS...`);

                  const response = await fetch(GOOGLE_SCRIPT_URL, {
                      method: "POST",
                      headers: { "Content-Type": "text/plain;charset=utf-8" },
                      body: JSON.stringify({
                          action: "upload",
                          fileName: file.name,
                          mimeType: file.type,
                          fileData: base64Content
                      })
                  });

                  const text = await response.text();
                  let data;
                  try {
                      data = JSON.parse(text);
                  } catch(e) {
                      console.error("GAS Response not JSON:", text);
                      throw new Error("Server returned unexpected response. Please ensuring you deployed the Google Apps Script as a 'New Version'.");
                  }

                  if (data.success && data.url) {
                      resolve(data.url);
                  } else {
                      throw new Error(data.error || "Server did not return a URL");
                  }
              } catch (e: any) {
                  console.error("Upload error details:", e);
                  reject(e.message || e);
              }
          };
          reader.onerror = error => reject(error);
      });
  }

  async addTicket(ticketData: {
      subject: string;
      category: string;
      description: string;
      location: string;
      severity: TicketSeverity;
      pid: string;
      requester: string;
      contactNumber: string;
      immediateSuperior: string;
      superiorContact: string;
      troubleshootingLog: string;
      attachmentUrl?: string; // Optional attachment
      // New Account Fields
      requesterName?: string;
      department?: string;
      position?: string;
  }): Promise<Ticket> {
    
    const isEmail = ticketData.requester.includes('@');
    
    // Format Description to include Account Details if provided
    let finalDescription = ticketData.description;
    if (ticketData.requesterName || ticketData.position) {
        finalDescription = `[Requester Info]\nName: ${ticketData.requesterName || 'N/A'}\nPosition: ${ticketData.position || 'N/A'}\nDept: ${ticketData.department || 'N/A'}\n\n[Issue]\n${ticketData.description}`;
    }

    const initialLog = ticketData.troubleshootingLog || "No troubleshooting steps recorded by AI.";

    const newTicket: Ticket = {
      id: Math.floor(10000 + Math.random() * 90000).toString(),
      dateCreated: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      pid: ticketData.pid,
      requesterEmail: isEmail ? ticketData.requester : 'N/A', 
      employeePin: !isEmail ? ticketData.requester : '',
      immediateSuperior: ticketData.immediateSuperior || '',
      superiorContact: ticketData.superiorContact || '',
      subject: ticketData.subject,
      category: ticketData.category,
      description: finalDescription,
      technician: 'Unassigned',
      location: ticketData.location,
      status: TicketStatus.OPEN,
      severity: ticketData.severity,
      contactNumber: ticketData.contactNumber,
      techNotes: '',
      troubleshootingLog: initialLog,
      attachmentUrl: ticketData.attachmentUrl
    };

    // Optimistic UI update
    this.tickets = [newTicket, ...this.tickets];
    this.notify();

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {},
            body: JSON.stringify({ ...newTicket, action: "create" }),
        });
        setTimeout(() => this.fetchTickets(), 2000);
    } catch (err) {
        console.error("Failed to save to Google Sheet", err);
        this.error = "Ticket created locally but failed to save to cloud.";
        this.notify();
    }

    return newTicket;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const ticketStore = new TicketStore();
