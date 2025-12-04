
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
  id: string;
  pid: string;
  dateCreated: string;
  requesterEmail: string;
  employeePin?: string;
  subject: string;
  category: string;
  description: string;
  technician: string;
  location: string;
  contactNumber: string;
  status: TicketStatus;
  severity: TicketSeverity;
  techNotes?: string;
  immediateSuperior?: string;
  superiorContact?: string;
  troubleshootingLog?: string;
  attachmentUrl?: string; // New field for file attachment link
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
