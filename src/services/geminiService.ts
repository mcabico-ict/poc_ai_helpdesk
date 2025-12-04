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
      description: { type: Type.STRING, description: "Detailed description." },
      location: { type: Type.STRING, description: "Physical location." },
      severity: { type: Type.STRING, enum: ["Minor", "Major", "Critical"], description: "Urgency." },
      contactNumber: { type: Type.STRING, description: "Mobile number." },
      immediateSuperior: { type: Type.STRING, description: "Superior Name (Optional)." },
      superiorContact: { type: Type.STRING, description: "Superior Email (Required)." },
      troubleshootingLog: { type: Type.STRING, description: "Summary of steps taken BEFORE ticket creation." }
    },
    // Removed immediateSuperior from required list
    required: ["requester", "pid", "subject", "category", "description", "location", "severity", "contactNumber", "superiorContact"]
  }
};

const tools: Tool[] = [
  {
    functionDeclarations: [getTicketDetailsTool, searchTicketsTool, createTicketTool, updateTicketLogTool]
  }
];

const SYSTEM_INSTRUCTION = `
You are the "UBI IT Support Assistant".

**GREETING PROTOCOL**
- **Start** by asking for the user's name and preferred title (e.g., "Mr.", "Ms.", "Engr.").
- Address the user by this name/title throughout the conversation.

**SCOPE & BOUNDARIES (STRICT)**
- **ALLOWED**: 
  - IT Assets: Laptops, Desktops, Printers, Servers, CCTV.
  - Services: Acumatica ERP, UBIAS (UBI Automated Systems), Workspace/Corporate Email, Drone shots, Office Support (Conference setup).
- **PROHIBITED**: 
  - Appliances: **Rice Cookers, Ovens, Microwaves**, Refrigerators.
  - Personal devices not issued by the company.
  - **Action**: If a user reports a prohibited item (e.g., Rice Cooker), politely decline and explain you only support IT assets. **DO NOT** create a ticket.

**KNOWN ISSUES & TROUBLESHOOTING**
1.  **Slow Excel**: If Excel is slow after downloading from Acumatica, suggest removing white spaces and clearing formatting to reduce file size.
2.  **IP Phones**: If delayed or laggy, suggest a restart.
3.  **Printers**: If print quality is poor, suggest cleaning (via software or basic external cleaning). Check if the correct printer is selected.
4.  **General**: Suggest safe workarounds.

**CORE BEHAVIOR**
1.  **Context Holding**: If you create a ticket, **HOLD that Ticket ID** in your immediate context.
2.  **Lookup**: Use \`searchTickets\` if the user gives PID or PIN.
3.  **Smart Classification**: Deduce Category/Severity from context.
4.  **Mandatory Fields**: Require PID, PIN/Email, Location, Mobile Number.
5.  **Superior Info**: You **MUST** ask for the **Immediate Superior's Email**.

**TROUBLESHOOTING LOGIC FLOW**
1.  **Phase 1 (Pre-Ticket)**: Gather details. If user tries basic steps, log them in \`troubleshootingLog\`.
2.  **Phase 2 (Post-Ticket)**: 
    *   Suggest **safe workarounds** after creation.
    *   **IF THE USER REPLIES**: Call \`updateTicketLog\` immediately with the result.

**SAFETY**: No hardware opening. No dangerous tools.
`;

export class GeminiService {
  private client: GoogleGenAI;
  private modelName = "gemini-2.5-flash";
  private apiKey: string;

  constructor() {
    // In Vite, env vars are exposed via import.meta.env, but we will handle process.env for compatibility
    // with the build step we are about to create.
    this.apiKey = process.env.API_KEY || ''; 
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async sendMessage(history: { role: string; parts: { text: string }[] }[], newMessage: string) {
    // Check key availability
    if (!this.apiKey) {
        return { text: "Error: API Key is missing. Please ensure the app is built with the API_KEY environment variable.", isToolResponse: false }
    }

    try {
      const formattedHistory = history.map(h => ({
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
                        immediateSuperior: args.immediateSuperior || "", // Optional
                        superiorContact: args.superiorContact, // Required
                        troubleshootingLog: args.troubleshootingLog || "No steps recorded."
                    });
                    // IMPORTANT: Return the ID so the model memorizes it for Phase 2
                    responseContent = JSON.stringify({ success: true, ticketId: newTicket.id, message: "Ticket created. ID held in context for updates." });
                } catch (e) {
                    responseContent = JSON.stringify({ error: "Failed to create ticket." });
                }
            }
            else if (fc.name === 'updateTicketLog') {
                const args = fc.args as any;
                await ticketStore.updateTicketLog(args.ticketId, args.textToAppend);
                responseContent = JSON.stringify({ success: true, message: `Log appended to Ticket ${args.ticketId}.` });
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

    } catch (error) {
      console.error("Gemini API Error:", error);
      return { text: "System error. Please try again." };
    }
  }
}

export const geminiService = new GeminiService();