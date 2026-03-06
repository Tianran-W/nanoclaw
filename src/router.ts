import { Channel, NewMessage } from './types.js';

function getTurnKey(jid: string, turnId: string): string {
  return `${jid}\u0000${turnId}`;
}

export function escapeXml(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatMessages(messages: NewMessage[]): string {
  const lines = messages.map(
    (m) =>
      `<message sender="${escapeXml(m.sender_name)}" time="${m.timestamp}">${escapeXml(m.content)}</message>`,
  );
  return `<messages>\n${lines.join('\n')}\n</messages>`;
}

export function stripInternalTags(text: string): string {
  return text.replace(/<internal>[\s\S]*?<\/internal>/g, '').trim();
}

export function formatOutbound(rawText: string): string {
  const text = stripInternalTags(rawText);
  if (!text) return '';
  return text;
}

export function createTurnMessageTracker(): {
  noteToolMessage: (
    jid: string,
    turnId: string | undefined,
    text: string,
  ) => void;
  shouldSendFinal: (
    jid: string,
    turnId: string | undefined,
    text: string,
  ) => boolean;
  finishTurn: (jid: string, turnId: string | undefined) => void;
  hasToolMessage: (jid: string, turnId: string | undefined) => boolean;
} {
  const toolMessages = new Map<string, Set<string>>();

  return {
    noteToolMessage(
      jid: string,
      turnId: string | undefined,
      text: string,
    ): void {
      if (!turnId) {
        return;
      }

      const key = getTurnKey(jid, turnId);
      const texts = toolMessages.get(key) || new Set<string>();
      texts.add(text);
      toolMessages.set(key, texts);
    },

    shouldSendFinal(
      jid: string,
      turnId: string | undefined,
      text: string,
    ): boolean {
      if (!turnId) {
        return true;
      }

      const key = getTurnKey(jid, turnId);
      const texts = toolMessages.get(key);
      toolMessages.delete(key);

      return !texts?.has(text);
    },

    finishTurn(jid: string, turnId: string | undefined): void {
      if (!turnId) {
        return;
      }

      toolMessages.delete(getTurnKey(jid, turnId));
    },

    hasToolMessage(jid: string, turnId: string | undefined): boolean {
      if (!turnId) {
        return false;
      }

      return toolMessages.has(getTurnKey(jid, turnId));
    },
  };
}

export function routeOutbound(
  channels: Channel[],
  jid: string,
  text: string,
): Promise<void> {
  const channel = channels.find((c) => c.ownsJid(jid) && c.isConnected());
  if (!channel) throw new Error(`No channel for JID: ${jid}`);
  return channel.sendMessage(jid, text);
}

export function findChannel(
  channels: Channel[],
  jid: string,
): Channel | undefined {
  return channels.find((c) => c.ownsJid(jid));
}
