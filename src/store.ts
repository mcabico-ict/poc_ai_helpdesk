
import { Ticket, TicketSeverity, TicketStatus } from "./types";

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx6jNAsLDBCucxp6p_KFv0MOb0-iS3x9i_LoPlbbJISq4kgjrkMFSNrjLFfRyzOC1Ghw/exec";

type Listener = () => void;

class TicketStore {
  private tickets: Ticket[] = [];
  private listeners: Listener[] = [];
  private isLoading: boolean = false;
  private error: string | null = null;
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

  /**
   * Logs activity to the "Audit Logs" sheet.
   * Cross-origin requests to Apps Script work best with 'no-cors' and 'text/plain'.
   */
  async logAudit(activity: string, userMessage: string = "", aiMessage: string = "") {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "logAudit",
          activity,
          userMessage,
          aiMessage
        }),
      });
    } catch (err) {
      console.warn("Audit log failed to send:", err);
    }
  }

  async fetchTickets() {
    if (!GOOGLE_SCRIPT_URL) return;
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
      this.error = "Sync Failed.";
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
        this.tickets[ticketIndex].troubleshootingLog = (this.tickets[ticketIndex].troubleshootingLog || "") + `\n${formattedLogEntry}`;
        this.notify();
    }
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ action: "updateLog", ticketId, textToAppend: formattedLogEntry }),
        });
        setTimeout(() => this.fetchTickets(), 3000);
    } catch (err) {}
  }

  async closeTicket(ticketId: string, reason: string) {
      const ticketIndex = this.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex !== -1) {
          this.tickets[ticketIndex].status = TicketStatus.CLOSED;
          this.notify();
      }
      try {
          await fetch(GOOGLE_SCRIPT_URL, {
              method: "POST",
              mode: "no-cors",
              body: JSON.stringify({ action: "closeTicket", ticketId, reason }),
          });
          setTimeout(() => this.fetchTickets(), 3000);
      } catch (err) {}
  }

  async uploadFile(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
              try {
                  const base64Content = (reader.result as string).split(',')[1];
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
                  const data = JSON.parse(await response.text());
                  if (data.success && data.url) resolve(data.url);
                  else throw new Error(data.error);
              } catch (e: any) { reject(e.message || e); }
          };
          reader.onerror = error => reject(error);
      });
  }

  async addTicket(ticketData: any): Promise<Ticket> {
    const isEmail = ticketData.requester.includes('@');
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
      troubleshootingLog: ticketData.troubleshootingLog,
      attachmentUrl: ticketData.attachmentUrl
    };
    this.tickets = [newTicket, ...this.tickets];
    this.notify();
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ ...newTicket, action: "create" }),
        });
        setTimeout(() => this.fetchTickets(), 2000);
    } catch (err) {}
    return newTicket;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify() { this.listeners.forEach(l => l()); }
}

export const ticketStore = new TicketStore();
