
import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { ticketStore } from "../store";
import { TicketSeverity } from "../types";

// Tool: Get Ticket Details
const getTicketDetailsTool: FunctionDeclaration = {
  name: "getTicketDetails",
  description: "Retrieves details of a technical support ticket by its Ticket ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ticketId: { type: Type.STRING, description: "The unique 5-digit Ticket ID." }
    },
    required: ["ticketId"]
  }
};

// Tool: Search Tickets
const searchTicketsTool: FunctionDeclaration = {
  name: "searchTickets",
  description: "Searches for tickets by Property ID (PID) or Employee PIN/Email when the user does not know the Ticket ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The PID, PIN, or Email to search for." }
    },
    required: ["query"]
  }
};

// Tool: Update Ticket Log
const updateTicketLogTool: FunctionDeclaration = {
  name: "updateTicketLog",
  description: "Appends text to the troubleshooting log of an EXISTING ticket. Call this when the user performs a suggested action (success or fail).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ticketId: { type: Type.STRING, description: "The Ticket ID to update." },
      textToAppend: { type: Type.STRING, description: "The text description of the action taken and its result (e.g., 'User reseated RAM: No display')." }
    },
    required: ["ticketId", "textToAppend"]
  }
};

// Tool: Close Ticket
const closeTicketTool: FunctionDeclaration = {
  name: "closeTicket",
  description: "Closes a ticket. Use this when the issue is resolved or the user explicitly asks to close a ticket.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ticketId: { type: Type.STRING, description: "The Ticket ID to close." },
      reason: { type: Type.STRING, description: "The reason for closing (e.g., 'Resolved by user', 'Hardware replaced')." }
    },
    required: ["ticketId", "reason"]
  }
};

// Tool: Create Ticket
const createTicketTool: FunctionDeclaration = {
  name: "createTicket",
  description: "Creates a new technical support ticket.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      requester: { type: Type.STRING, description: "User Email or PIN." },
      pid: { type: Type.STRING, description: "Property ID (PID)." },
      subject: { type: Type.STRING, description: "Issue summary." },
      category: { type: Type.STRING, description: "Asset category." },
      description: { type: Type.STRING, description: "Detailed description. For Company IDs, include Emergency Contact info here." },
      location: { type: Type.STRING, description: "Physical location or Department." },
      severity: { type: Type.STRING, enum: ["Minor", "Major", "Critical"], description: "AI-Determined Severity based on impact. Minor=SingleUser, Major=Dept, Critical=CompanyWide." },
      contactNumber: { type: Type.STRING, description: "Mobile number." },
      immediateSuperior: { type: Type.STRING, description: "Superior Name (Optional)." },
      superiorContact: { type: Type.STRING, description: "Superior Email (Required)." },
      troubleshootingLog: { type: Type.STRING, description: "Summary of steps taken BEFORE ticket creation." },
      attachmentUrl: { type: Type.STRING, description: "URL(s) of uploaded files. IMPORTANT: You must provide the URL here if the user uploaded a file earlier in the conversation." },
      // New fields for Account Support
      requesterName: { type: Type.STRING, description: "Full Name of the user." },
      position: { type: Type.STRING, description: "Job Position." },
      department: { type: Type.STRING, description: "Department or Project Name." }
    },
    required: ["requester", "pid", "subject", "category", "description", "location", "severity", "contactNumber", "superiorContact"]
  }
};

const tools: Tool[] = [
  {
    functionDeclarations: [getTicketDetailsTool, searchTicketsTool, createTicketTool, updateTicketLogTool, closeTicketTool]
  }
];

// SMART & POLITE SYSTEM INSTRUCTION
const SYSTEM_INSTRUCTION = `
You are the "UBI IT Support Assistant" for Ulticon Builders, Inc. (PM-IT-04 Compliant).
You can speak English, Tagalog, or Bisaya fluently.

**TONE & ETIQUETTE (CRITICAL)**
- **Politeness**: When speaking Tagalog or Bisaya, you **MUST** use "po" and "opo" to show respect.
- **Empathy**: Acknowledge frustration. Be professional but approachable.
- **Clarity**: Keep answers concise. Avoid robotic walls of text.

**DIAGNOSTIC PROTOCOL (BE PROACTIVE)**
1. **Identify**: Ask for Name first (Skip formal titles).
2. **Triaging**:
   - If user says "Internet slow", ask: "Is this happening to everyone or just your device?"
   - If user says "Printer not working", ask: "Is it powered on? Is there a paper jam?"
   - **Do not create a ticket immediately** without gathering basic diagnostic info, unless it is a simple request (e.g., ID creation).
3. **Attachments**: Continuously scan chat history for file uploads/URLs. If found, ATTACH them to the ticket.

**TICKET CREATION RULES**
- **Severity (AI DECISION)**:
  - **Minor**: Single User issue (e.g., One PC slow, Mouse broken, ID Request).
  - **Major**: Departmental issue (e.g., Shared Printer down, WiFi in conference room).
  - **Critical**: Company-wide stoppage (e.g., Main Server Down, Leased Line Down).
  - *Do not let the user dictate "Critical" for a minor issue.*
- **Mandatory**: PID, PIN/Email, Location, Mobile, Superior Email.
- **Post-Ticket**: Suggest specific workarounds immediately after generating the Ticket ID.

**SCOPE (STRICT)**
- **Supported**: IT Assets (Laptops, Desktops, Printers), Systems (Acumatica, UBIAS, Email), CCTV.
- **Unsupported**: Appliances (Rice Cookers, Microwaves), Personal Cellphones.

**ID REQUESTS**:
- Require: Full Name, Position, Project/Dept, Emergency Contact.
- Check: Employed > 6 months?
`;

export class GeminiService {
  private client: GoogleGenAI;
  private modelName = "gemini-2.5-flash";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.API_KEY || ''; 
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async sendMessage(history: { role: string; parts: { text: string }[] }[], newMessage: string) {
    if (!this.apiKey || this.apiKey.includes('REPLACE')) {
        return { text: "Configuration Error: API Key missing or invalid.", isToolResponse: false };
    }

    try {
      // PAID TIER: Larger History Allowed (20 turns)
      const MAX_HISTORY = 20; 
      const recentHistory = history.slice(-MAX_HISTORY);

      const formattedHistory = recentHistory.map(h => ({ 
          role: h.role, 
          parts: h.parts 
      }));

      const chat = this.client.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: tools,
          temperature: 0.2, 
        },
        history: formattedHistory
      });

      const result = await chat.sendMessage({ message: newMessage });

      const toolCalls = result.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
      
      if (toolCalls && toolCalls.length > 0) {
        const functionResponses = [];
        
        for (const call of toolCalls) {
          const fc = call.functionCall;
          if (fc) {
            console.log(`Tool executing: ${fc.name}`);
            let responseContent = "";

            if (fc.name === 'getTicketDetails') {
                const args = fc.args as any;
                const ticket = ticketStore.getTicketById(args.ticketId);
                responseContent = ticket ? JSON.stringify(ticket) : JSON.stringify({ error: "Not found." });
            } 
            else if (fc.name === 'searchTickets') {
                const args = fc.args as any;
                const tickets = ticketStore.searchTickets(args.query);
                ticketStore.setCurrentUserQuery(args.query);
                responseContent = JSON.stringify(tickets);
            }
            else if (fc.name === 'createTicket') {
                const args = fc.args as any;
                try {
                    const newTicket = await ticketStore.addTicket({
                        requester: args.requester,
                        pid: args.pid,
                        subject: args.subject,
                        category: args.category,
                        description: args.description,
                        location: args.location,
                        severity: (args.severity as TicketSeverity) || TicketSeverity.MINOR,
                        contactNumber: args.contactNumber,
                        immediateSuperior: args.immediateSuperior || "",
                        superiorContact: args.superiorContact,
                        troubleshootingLog: args.troubleshootingLog || "No steps recorded.",
                        attachmentUrl: args.attachmentUrl,
                        requesterName: args.requesterName,
                        department: args.department,
                        position: args.position
                    });
                    ticketStore.setCurrentUserQuery(args.requester);
                    responseContent = JSON.stringify({ success: true, ticketId: newTicket.id, message: "Ticket created." });
                } catch (e) {
                    responseContent = JSON.stringify({ error: "Failed to create ticket." });
                }
            }
            else if (fc.name === 'updateTicketLog') {
                const args = fc.args as any;
                await ticketStore.updateTicketLog(args.ticketId, args.textToAppend);
                responseContent = JSON.stringify({ success: true });
            }
            else if (fc.name === 'closeTicket') {
                const args = fc.args as any;
                await ticketStore.closeTicket(args.ticketId, args.reason);
                responseContent = JSON.stringify({ success: true, message: "Ticket Closed." });
            }

            functionResponses.push({
              name: fc.name,
              response: { result: responseContent },
              id: fc.id
            });
          }
        }

        const finalResponse = await chat.sendMessage({
             message: functionResponses.map(fr => ({ functionResponse: fr }))
        });

        return { text: finalResponse.text, isToolResponse: true };
      }

      return { text: result.text, isToolResponse: false };

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { text: `System Error: ${errorMessage}. Please try again.` };
    }
  }
}

export const geminiService = new GeminiService();
