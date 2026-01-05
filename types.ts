
export enum AssetType {
  SYSTEM_UNIT = 'System Unit',
  PRINTER = 'Printer',
  LAPTOP = 'Laptop',
  SERVER = 'Server',
  CCTV = 'CCTV'
}

export enum TicketStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In-Progress',
  ON_HOLD = 'On-Hold',
  DONE = 'Done',
  CLOSED = 'Closed'
}

export enum TicketSeverity {
  MINOR = 'Minor',
  MAJOR = 'Major',
  CRITICAL = 'Critical'
}

export interface Ticket {
  id: string; // Ticket ID e.g., 83118
  pid: string; // Property ID e.g., 03264
  dateCreated: string;
  requesterEmail: string;
  employeePin?: string; // Added Employee PIN
  subject: string;
  category: string; // e.g., Laptop, System Unit
  description: string; // User notes
  technician: string;
  location: string;
  contactNumber: string;
  status: TicketStatus;
  severity: TicketSeverity;
  techNotes?: string;
  immediateSuperior?: string; // New: Name/Position of superior
  superiorContact?: string; // New: Email or Phone of superior
  troubleshootingLog?: string; // New: Summary of steps taken
  // Added attachmentUrl to resolve type errors in TicketManager
  attachmentUrl?: string; 
}

export interface PMSSchedule {
  deviceId: string;
  item: AssetType;
  location: string;
  q1Date: string;
  q1Status: 'DUNAN' | 'WAAY';
  q2Date: string;
  q2Status: 'DUNAN' | 'WAAY';
  q3Date: string;
  q3Status: 'DUNAN' | 'WAAY';
  q4Date: string;
  q4Status: 'DUNAN' | 'WAAY';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  isToolCall?: boolean;
}