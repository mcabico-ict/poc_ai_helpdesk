
import { Ticket, TicketSeverity, TicketStatus } from "./types";

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx6jNAsLDBCucxp6p_KFv0MOb0-iS3x9i_LoPlbbJISq4kgjrkMFSNrjLFfRyzOC1Ghw/exec";

type Listener = () => void;

class TicketStore {
  private tickets: Ticket[] = [];
  private listeners: Listener[] = [];
  private isLoading: boolean = false;
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
      })).reverse();
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      this.isLoading = false;
      this.notify();
    }
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
      troubleshootingLog: ticketData.troubleshootingLog
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
