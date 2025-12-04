

import { AssetType, PMSSchedule, Ticket, TicketSeverity, TicketStatus } from "./types";

// Mock Stats derived from Dashboard Screenshot
export const DASHBOARD_STATS = {
  systemUnit: 397,
  printer: 454,
  laptop: 414,
  server: 2
};

export const PMS_QUARTER_STATS = [
  { label: '01/01/2024 to 03/31/2024', percent: 100 },
  { label: '04/01/2024 to 06/30/2024', percent: 100 },
  { label: '07/01/2024 to 09/31/2024', percent: 100 },
  { label: '10/01/2024 to 12/31/2024', percent: 8.3 }
];

// Initial Data Seed for Store
export const MOCK_TICKETS: Ticket[] = [
  {
    id: '83118',
    pid: '03264',
    dateCreated: 'October 8, 2024',
    requesterEmail: 'annamichellelsiguano@gmail.com',
    subject: 'Request To Activate OS Of The Laptop Of Newly Hired Field Auditor',
    category: 'Laptop',
    description: 'Resquest to activate OS of the laptop of newly hired field auditor',
    technician: 'MARK JASON DUNAN',
    location: 'CORPORATE OFFICE INTERNAL AUDIT DEPT',
    contactNumber: '09515182952',
    status: TicketStatus.DONE,
    severity: TicketSeverity.MINOR,
    techNotes: 'OS Activated via KMS.'
  },
  {
    id: '83107',
    pid: '03440',
    dateCreated: 'October 8, 2024',
    requesterEmail: 'kathleenmorilla@ulticonbuildersinc.com',
    subject: 'PC Won\'t Start Due To Pop-Up "BIOS Setup"',
    category: 'System Unit',
    description: 'PC won\'t start due to pop-up "BIOS Setup".',
    technician: 'MARK JASON DUNAN',
    location: 'ACCOUNTING DEPARTMENT : A-0000',
    contactNumber: '09505392032',
    status: TicketStatus.DONE,
    severity: TicketSeverity.MAJOR,
    techNotes: 'Reseated CMOS battery. BIOS reset to default.'
  },
  {
    id: '83047',
    pid: '11331',
    dateCreated: '10/01/2024',
    requesterEmail: 'system-generated',
    subject: 'Laptop (PMS)',
    category: 'Scheduled Preventive Maintenance / Laptop',
    description: '1. Check power cable\n2. Clean internal parts\n3. Clean external parts\n4. Check disk spaces\n5. Check software updates\n6. Update deskguard details',
    technician: 'KHYL WAAY',
    location: 'A/P - FINANCE',
    contactNumber: 'N/A',
    status: TicketStatus.DONE,
    severity: TicketSeverity.MINOR,
    techNotes: 'All checks passed. Device cleaned.'
  }
];

// Mock PMS Schedule derived from Screenshot
export const MOCK_PMS_SCHEDULE: PMSSchedule[] = [
  {
    deviceId: '15912',
    item: AssetType.CCTV,
    location: 'CCTV - IT DEPARTMENT',
    q1Date: '2024-02-14', q1Status: 'DUNAN',
    q2Date: '2024-05-15', q2Status: 'DUNAN',
    q3Date: '2024-08-15', q3Status: 'DUNAN',
    q4Date: '2024-11-18', q4Status: 'DUNAN',
  },
  {
    deviceId: '03241',
    item: AssetType.SYSTEM_UNIT,
    location: 'girder fabrication',
    q1Date: '2024-02-19', q1Status: 'DUNAN',
    q2Date: '2024-05-21', q2Status: 'DUNAN',
    q3Date: '2024-07-10', q3Status: 'DUNAN',
    q4Date: '2024-10-10', q4Status: 'DUNAN',
  },
  {
    deviceId: '03146',
    item: AssetType.SYSTEM_UNIT,
    location: 'Tupaz',
    q1Date: '2024-02-19', q1Status: 'WAAY',
    q2Date: '2024-05-21', q2Status: 'WAAY',
    q3Date: '2024-07-10', q3Status: 'WAAY',
    q4Date: '2024-10-10', q4Status: 'WAAY',
  }
];
