import { Channel, NewMessage } from './types.js';

interface RecentOutboundEntry {
  text: string;
  timestamp: number;
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

export function createOutboundDeduper(windowMs = 15_000): {
  shouldSend: (jid: string, text: string, now?: number) => boolean;
} {
  const recent = new Map<string, RecentOutboundEntry>();

  return {
    shouldSend(jid: string, text: string, now = Date.now()): boolean {
      const previous = recent.get(jid);
      if (
        previous &&
        previous.text === text &&
        now - previous.timestamp <= windowMs
      ) {
        return false;
      }

      recent.set(jid, { text, timestamp: now });

      for (const [key, entry] of recent) {
        if (now - entry.timestamp > windowMs) {
          recent.delete(key);
        }
      }

      return true;
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
