
import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { ticketStore } from "../store";
import { TicketSeverity } from "../types";

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
const searchTicketsTool: FunctionDeclaration = {
  name: "searchTickets",
  description: "Searches for tickets by Property ID (PID) or Employee PIN/Email.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "PID, PIN, or Email." }
    },
    required: ["query"]
  }
};
const updateTicketLogTool: FunctionDeclaration = {
  name: "updateTicketLog",
  description: "Appends text to the troubleshooting log of an EXISTING ticket.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ticketId: { type: Type.STRING, description: "The Ticket ID." },
      textToAppend: { type: Type.STRING, description: "Action taken and result." }
    },
    required: ["ticketId", "textToAppend"]
  }
};
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
      troubleshootingLog: { type: Type.STRING, description: "Summary of steps taken." }
    },
    required: ["requester", "pid", "subject", "category", "description", "location", "severity", "contactNumber", "superiorContact"]
  }
};

const tools: Tool[] = [
  { functionDeclarations: [getTicketDetailsTool, searchTicketsTool, createTicketTool, updateTicketLogTool] }
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

**TROUBLESHOOTING KNOWLEDGE**
1.  **Slow Excel**: If Excel is slow after downloading from Acumatica, suggest removing white spaces and clearing formatting.
2.  **IP Phones**: If delayed or laggy, suggest a restart.
3.  **Printers**: If print quality is poor, suggest cleaning. Check active printer selection.

**CORE BEHAVIOR**
1.  **Context Holding**: If you create a ticket, **HOLD that Ticket ID**.
2.  **Mandatory Fields**: Require PID, PIN/Email, Location, Mobile Number, Superior Email.
3.  **Post-Ticket**: After creation, suggest workarounds. If user replies, call \`updateTicketLog\`.

**SAFETY**: No hardware opening. No dangerous tools.
`;

export class GeminiService {
  private client: GoogleGenAI;
  // Updated model to latest gemini-3-flash-preview
  private modelName = "gemini-3-flash-preview";

  constructor() {
    // Correctly using direct API key initialization
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async sendMessage(history: { role: string; parts: { text: string }[] }[], newMessage: string) {
    if (!process.env.API_KEY) return { text: "Error: API Key is missing.", isToolResponse: false };

    try {
      const formattedHistory = history.map(h => ({ role: h.role, parts: h.parts }));
      const chat = this.client.chats.create({
        model: this.modelName,
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: tools, temperature: 0.2 },
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
                        immediateSuperior: args.immediateSuperior || "",
                        superiorContact: args.superiorContact,
                        troubleshootingLog: args.troubleshootingLog || "No steps recorded."
                    });
                    responseContent = JSON.stringify({ success: true, ticketId: newTicket.id, message: "Ticket created. ID held in context." });
                } catch (e) {
                    responseContent = JSON.stringify({ error: "Failed to create ticket." });
                }
            }
            else if (fc.name === 'updateTicketLog') {
                const args = fc.args as any;
                await ticketStore.updateTicketLog(args.ticketId, args.textToAppend);
                responseContent = JSON.stringify({ success: true, message: "Log updated." });
            }

            functionResponses.push({ name: fc.name, response: { result: responseContent }, id: fc.id });
          }
        }
        // Respond to tool calls using chat.sendMessage as per guidelines
        const finalResponse = await chat.sendMessage({ message: functionResponses.map(fr => ({ functionResponse: fr })) });
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
