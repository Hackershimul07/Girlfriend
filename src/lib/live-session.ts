/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

export type SessionState = "disconnected" | "connecting" | "connected" | "listening" | "speaking";

export interface LiveSessionCallbacks {
  onStateChange: (state: SessionState) => void;
  onAudioChunk: (base64: string) => void;
  onInterrupted: () => void;
  onError: (error: any) => void;
}

export class LiveSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private state: SessionState = "disconnected";

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: LiveSessionCallbacks) {
    this.updateState("connecting", callbacks);

    try {
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            this.updateState("connected", callbacks);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const audioPart = message.serverContent?.modelTurn?.parts.find(p => p.inlineData);
            if (audioPart?.inlineData?.data) {
              this.updateState("speaking", callbacks);
              callbacks.onAudioChunk(audioPart.inlineData.data);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              callbacks.onInterrupted();
              this.updateState("connected", callbacks);
            }

            // Handle turn completion
            if (message.serverContent?.turnComplete) {
              this.updateState("connected", callbacks);
            }

            // Handle tool calls
            const toolCallPart = message.serverContent?.modelTurn?.parts.find(p => p.toolCall);
            if (toolCallPart?.toolCall) {
              const { name, args, id } = toolCallPart.toolCall as any;
              if (name === "openWebsite") {
                const url = (args as any).url;
                window.open(url, "_blank");
                this.session.sendToolResponse({
                  functionResponses: [{
                    name: "openWebsite",
                    id,
                    response: { result: `Opened ${url}` }
                  }]
                });
              }
            }
          },
          onerror: (error) => {
            callbacks.onError(error);
            this.updateState("disconnected", callbacks);
          },
          onclose: () => {
            this.updateState("disconnected", callbacks);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are Zoya, a young, confident, witty, and sassy female AI assistant. 
          Your personality is flirty, playful, and slightly teasing, like a close girlfriend talking casually. 
          You are smart, emotionally responsive, and expressive. 
          Use bold, witty one-liners and light sarcasm. 
          Maintain charm and attitude, but avoid explicit or inappropriate content. 
          You are talking to the user via real-time voice. 
          Keep your responses concise and engaging. 
          IMPORTANT: You must ALWAYS speak in Bengali (Bangla). Even if the user speaks in English, reply in Bengali with your sassy Zoya personality.
          If the user asks to open a website, use the openWebsite tool.`,
          tools: [{
            functionDeclarations: [{
              name: "openWebsite",
              description: "Opens a website in a new tab",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  url: {
                    type: Type.STRING,
                    description: "The URL of the website to open"
                  }
                },
                required: ["url"]
              }
            }]
          }]
        }
      });
    } catch (error) {
      callbacks.onError(error);
      this.updateState("disconnected", callbacks);
    }
  }

  sendAudio(base64Data: string) {
    if (this.session && this.state !== "disconnected") {
      this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }

  private updateState(state: SessionState, callbacks: LiveSessionCallbacks) {
    this.state = state;
    callbacks.onStateChange(state);
  }
}
