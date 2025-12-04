
import { Ticket, TicketSeverity, TicketStatus } from "./types";

// The Google Apps Script Web App URL provided by the user (New Deployment)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw1owYiLKokfMrqpYkNNZpAw42Cs7oF03oxD6ZSLgGi6za3aeDeD4YpY5mX1ngv4-4Oog/exec";

/* 
   IMPORTANT: YOU MUST UPDATE YOUR GOOGLE APPS SCRIPT DEPLOYMENT!
   1. Paste the code from the chat into Apps Script.
   2. Deploy -> Manage Deployments -> Edit -> Version: "New version" -> Deploy.
*/

type Listener = () => void;

class TicketStore {
  private tickets: Ticket[] = [];
  private listeners: Listener[] = [];
  private isLoading: boolean = false;
  private error: string | null = null;

  constructor() {
    this.fetchTickets();
  }

  getTickets(): Ticket[] {
    return this.tickets;
  }

  getTicketById(id: string): Ticket | undefined {
    return this.tickets.find(t => t.id === id);
  }

  // New method to search tickets
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
          // FORCE STRING CONVERSION: Handles cases where Google Sheet returns a number (e.g. 40884)
          employeePin: t.employeePin ? String(t.employeePin) : undefined,
          requesterEmail: t.requesterEmail ? String(t.requesterEmail) : 'N/A',
          techNotes: t.techNotes || undefined,
          immediateSuperior: t.immediateSuperior || undefined,
          superiorContact: t.superiorContact || undefined,
          troubleshootingLog: t.troubleshootingLog || undefined
      })).reverse();
      
    } catch (err) {
      console.error("Failed to fetch tickets", err);
      this.error = "Sync Failed. Please check internet connection.";
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  // Update Ticket Log (Append Only)
  async updateTicketLog(ticketId: string, textToAppend: string) {
    // 1. Format the log entry locally with timestamp
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const formattedLogEntry = `[${timestamp}]: ${textToAppend}`;

    // 2. Optimistic Update (Update UI immediately)
    const ticketIndex = this.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex !== -1) {
        const updatedTicket = { ...this.tickets[ticketIndex] };
        updatedTicket.troubleshootingLog = (updatedTicket.troubleshootingLog || "") + `\n${formattedLogEntry}`;
        this.tickets[ticketIndex] = updatedTicket;
        this.notify();
    }

    // 3. Send to Google Sheet (Action: updateLog)
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {},
            body: JSON.stringify({
                action: "updateLog",
                ticketId: ticketId,
                // FIX: Sending BOTH property names to ensure compatibility with different script versions
                textToAppend: formattedLogEntry, 
                log: formattedLogEntry 
            }),
        });
        
        // Background refresh to confirm the sheet actually updated
        setTimeout(() => this.fetchTickets(), 3000);
        
    } catch (err) {
        console.error("Failed to update log in Google Sheet", err);
    }
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
  }): Promise<Ticket> {
    
    const isEmail = ticketData.requester.includes('@');
    
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
      description: ticketData.description,
      technician: 'Unassigned',
      location: ticketData.location,
      status: TicketStatus.OPEN,
      severity: ticketData.severity,
      contactNumber: ticketData.contactNumber,
      techNotes: '',
      troubleshootingLog: initialLog
    };

    // Optimistic UI update
    this.tickets = [newTicket, ...this.tickets];
    this.notify();

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {},
            body: JSON.stringify(newTicket),
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
