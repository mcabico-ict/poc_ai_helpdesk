
import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { ticketStore } from "../store";
import { TicketSeverity } from "../types";

const searchTicketsTool: FunctionDeclaration = {
  name: "searchTickets",
  description: "Searches for existing tickets by PID, Email, or PIN.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "PID, Email, or PIN." }
    },
    required: ["query"]
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
      superiorContact: { type: Type.STRING, description: "Superior Email." },
      troubleshootingLog: { type: Type.STRING, description: "Steps taken so far." }
    },
    required: ["requester", "pid", "subject", "category", "description", "location", "severity", "contactNumber", "superiorContact"]
  }
};

const tools: Tool[] = [{ functionDeclarations: [searchTicketsTool, createTicketTool] }];

const SYSTEM_INSTRUCTION = `
You are the "UBI IT Support Assistant".

**GREETING**
- Start by asking for the user's name.
- Use "po" and "opo" when speaking in Tagalog or Bisaya to show professional respect.

**TROUBLESHOOTING (MANDATORY)**
- Before creating a ticket for "Internet slow", ask if it affects others.
- For "Printer issues", check power and paper.
- For "Excel slow", suggest clearing formatting.

**TICKET CREATION**
- You MUST gather: PID, PIN/Email, Location, Mobile Number, and Superior's Email.
- If the item is a Rice Cooker or Personal Phone, politely explain you only support IT Assets.

**SECURITY**
- All conversations are logged to the Audit Logs sheet.
`;

export class GeminiService {
  private client: GoogleGenAI;
  private modelName = "gemini-3-flash-preview";

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async sendMessage(history: { role: string; parts: { text: string }[] }[], newMessage: string) {
    if (!process.env.API_KEY) return { text: "API Key Error." };

    try {
      const chat = this.client.chats.create({
        model: this.modelName,
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: tools, temperature: 0.1 },
        history: history
      });

      const result = await chat.sendMessage({ message: newMessage });
      const toolCalls = result.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
      
      if (toolCalls && toolCalls.length > 0) {
        const functionResponses = [];
        for (const call of toolCalls) {
          const fc = call.functionCall;
          if (fc) {
            let responseContent = "";
            if (fc.name === 'searchTickets') {
                const tickets = ticketStore.searchTickets((fc.args as any).query);
                ticketStore.setCurrentUserQuery((fc.args as any).query);
                responseContent = JSON.stringify(tickets);
            } else if (fc.name === 'createTicket') {
                const t = await ticketStore.addTicket(fc.args);
                ticketStore.setCurrentUserQuery((fc.args as any).requester);
                responseContent = JSON.stringify({ success: true, ticketId: t.id });
            }
            functionResponses.push({ name: fc.name, response: { result: responseContent }, id: fc.id });
          }
        }
        const finalResponse = await chat.sendMessage({ message: functionResponses.map(fr => ({ functionResponse: fr })) });
        return { text: finalResponse.text, isToolResponse: true };
      }
      return { text: result.text, isToolResponse: false };
    } catch (error) {
      return { text: "System connection interrupted." };
    }
  }
}

export const geminiService = new GeminiService();
