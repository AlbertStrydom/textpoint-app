import net from "node:net";
import tls from "node:tls";
import { ENV } from "./env";

type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string | null;
};

type SmtpResponse = {
  code: number;
  lines: string[];
};

type LineReader = {
  nextLine: () => Promise<string>;
};

const CRLF = "\r\n";

function normalizeRecipients(input: string | string[]): string[] {
  return (Array.isArray(input) ? input : [input])
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseEnvelopeAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function createLineReader(socket: net.Socket | tls.TLSSocket): LineReader {
  let buffer = "";
  const lines: string[] = [];
  const waiters: Array<(line: string) => void> = [];

  socket.on("data", (chunk: Buffer | string) => {
    buffer += chunk.toString("utf8");

    while (true) {
      const lineBreakIndex = buffer.indexOf(CRLF);
      if (lineBreakIndex < 0) break;
      const line = buffer.slice(0, lineBreakIndex);
      buffer = buffer.slice(lineBreakIndex + CRLF.length);
      const waiter = waiters.shift();
      if (waiter) {
        waiter(line);
      } else {
        lines.push(line);
      }
    }
  });

  return {
    nextLine: () =>
      new Promise((resolve) => {
        const existing = lines.shift();
        if (existing != null) {
          resolve(existing);
          return;
        }
        waiters.push(resolve);
      }),
  };
}

async function readResponse(reader: LineReader): Promise<SmtpResponse> {
  const firstLine = await reader.nextLine();
  const lines = [firstLine];
  const code = Number.parseInt(firstLine.slice(0, 3), 10);

  if (firstLine[3] === "-") {
    while (true) {
      const nextLine = await reader.nextLine();
      lines.push(nextLine);
      if (nextLine.startsWith(`${code} `)) {
        break;
      }
    }
  }

  return { code, lines };
}

function assertResponse(
  response: SmtpResponse,
  expectedCodes: number[],
  step: string
) {
  if (expectedCodes.includes(response.code)) return;
  throw new Error(
    `SMTP ${step} failed with ${response.code}: ${response.lines.join(" | ")}`
  );
}

function sendCommand(
  socket: net.Socket | tls.TLSSocket,
  command: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.write(`${command}${CRLF}`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function buildMessage(message: EmailMessage, from: string): string {
  const recipients = normalizeRecipients(message.to);
  const headers = [
    `From: ${from}`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${message.subject.replace(/\r?\n/g, " ").trim()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    `Date: ${new Date().toUTCString()}`,
  ];

  if (message.replyTo?.trim()) {
    headers.push(`Reply-To: ${message.replyTo.trim()}`);
  }

  const body = message.text
    .replace(/\r?\n/g, CRLF)
    .split(CRLF)
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join(CRLF);

  return `${headers.join(CRLF)}${CRLF}${CRLF}${body}`;
}

async function upgradeToTls(
  socket: net.Socket,
  host: string
): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect(
      {
        socket,
        servername: host,
      },
      () => resolve(secureSocket)
    );
    secureSocket.once("error", reject);
  });
}

async function openSocket(): Promise<{
  socket: net.Socket | tls.TLSSocket;
  reader: LineReader;
}> {
  const baseSocket = await new Promise<net.Socket>((resolve, reject) => {
    const socket = ENV.smtpSecure
      ? (tls.connect(
          {
            host: ENV.smtpHost,
            port: ENV.smtpPort,
            servername: ENV.smtpHost ?? undefined,
          },
          () => resolve(socket)
        ) as unknown as net.Socket)
      : net.createConnection(
          {
            host: ENV.smtpHost,
            port: ENV.smtpPort,
          },
          () => resolve(socket)
        );

    socket.once("error", reject);
  });

  return {
    socket: baseSocket,
    reader: createLineReader(baseSocket),
  };
}

function getConfiguredFromAddress(): string | null {
  const from = ENV.smtpFrom?.trim();
  if (!from) return null;
  return from;
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(ENV.smtpHost && getConfiguredFromAddress());
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!isEmailDeliveryConfigured()) {
    return false;
  }

  const from = getConfiguredFromAddress();
  if (!from || !ENV.smtpHost) {
    return false;
  }

  let socket: net.Socket | tls.TLSSocket | null = null;

  try {
    const opened = await openSocket();
    socket = opened.socket;
    let reader = opened.reader;

    socket.setEncoding("utf8");

    const greeting = await readResponse(reader);
    assertResponse(greeting, [220], "connect");

    await sendCommand(socket, "EHLO textpoint.local");
    let ehlo = await readResponse(reader);
    assertResponse(ehlo, [250], "EHLO");

    const supportsStartTls = ehlo.lines.some((line) =>
      line.toUpperCase().includes("STARTTLS")
    );

    if (!ENV.smtpSecure && ENV.smtpStartTls && supportsStartTls) {
      await sendCommand(socket, "STARTTLS");
      const startTls = await readResponse(reader);
      assertResponse(startTls, [220], "STARTTLS");
      socket = await upgradeToTls(socket as net.Socket, ENV.smtpHost);
      socket.setEncoding("utf8");
      reader = createLineReader(socket);
      await sendCommand(socket, "EHLO textpoint.local");
      ehlo = await readResponse(reader);
      assertResponse(ehlo, [250], "EHLO after STARTTLS");
    }

    if (ENV.smtpUser) {
      if (!ENV.smtpPassword) {
        throw new Error("SMTP_PASSWORD is required when SMTP_USER is set.");
      }

      await sendCommand(socket, "AUTH LOGIN");
      const authPrompt = await readResponse(reader);
      assertResponse(authPrompt, [334], "AUTH LOGIN");

      await sendCommand(
        socket,
        Buffer.from(ENV.smtpUser, "utf8").toString("base64")
      );
      const userPrompt = await readResponse(reader);
      assertResponse(userPrompt, [334], "AUTH LOGIN username");

      await sendCommand(
        socket,
        Buffer.from(ENV.smtpPassword, "utf8").toString("base64")
      );
      const passwordPrompt = await readResponse(reader);
      assertResponse(passwordPrompt, [235], "AUTH LOGIN password");
    }

    const recipients = normalizeRecipients(message.to);
    if (recipients.length === 0) {
      return false;
    }

    await sendCommand(socket, `MAIL FROM:<${parseEnvelopeAddress(from)}>`); 
    assertResponse(await readResponse(reader), [250], "MAIL FROM");

    for (const recipient of recipients) {
      await sendCommand(socket, `RCPT TO:<${parseEnvelopeAddress(recipient)}>`); 
      assertResponse(await readResponse(reader), [250, 251], "RCPT TO");
    }

    await sendCommand(socket, "DATA");
    assertResponse(await readResponse(reader), [354], "DATA");

    const rawMessage = buildMessage(message, from);
    await sendCommand(socket, `${rawMessage}${CRLF}.`);
    assertResponse(await readResponse(reader), [250], "message body");

    await sendCommand(socket, "QUIT");
    await readResponse(reader).catch(() => null);
    socket.end();
    return true;
  } catch (error) {
    console.warn("[Email] Failed to send email:", error);
    socket?.destroy();
    return false;
  }
}
