import { connect } from 'cloudflare:sockets'

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function encodeMimeHeader(text: string) {
  return `=?UTF-8?B?${toBase64(text)}?=`
}

function chunkBase64(text: string) {
  const encoded = toBase64(text)
  const lines: string[] = []

  for (let index = 0; index < encoded.length; index += 76) {
    lines.push(encoded.slice(index, index + 76))
  }

  return lines.join('\r\n')
}

async function createLineReader(readable: ReadableStream<Uint8Array>) {
  const reader = readable.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  return async function readLine() {
    while (!buffer.includes('\n')) {
      const { done, value } = await reader.read()

      if (done) {
        if (!buffer) {
          return null
        }

        const rest = buffer
        buffer = ''
        return rest
      }

      buffer += decoder.decode(value, { stream: true })
    }

    const newlineIndex = buffer.indexOf('\n')
    const line = buffer.slice(0, newlineIndex + 1)
    buffer = buffer.slice(newlineIndex + 1)

    return line.trimEnd()
  }
}

async function readResponse(readLine: () => Promise<string | null>) {
  const firstLine = await readLine()

  if (!firstLine) {
    throw new Error('SMTP 连接被提前关闭')
  }

  const code = Number(firstLine.slice(0, 3))

  if (!Number.isFinite(code)) {
    throw new Error(`SMTP 响应异常: ${firstLine}`)
  }

  let lastLine = firstLine

  while (lastLine[3] === '-') {
    const nextLine = await readLine()

    if (!nextLine) {
      break
    }

    lastLine = nextLine
  }

  if (code >= 400) {
    throw new Error(`SMTP 发送失败: ${lastLine}`)
  }

  return { code, line: lastLine }
}

async function writeLine(writer: WritableStreamDefaultWriter<Uint8Array>, line: string) {
  await writer.write(new TextEncoder().encode(`${line}\r\n`))
}

export async function sendMailWithQqSmtp({
  user,
  pass,
  host,
  port,
  to,
  subject,
  text,
}: {
  user: string
  pass: string
  host?: string
  port?: number
  to: string
  subject: string
  text: string
}) {
  const smtpHost = host?.trim() || 'smtp.qq.com'
  const smtpPort = Number.isFinite(port) && port ? port : 465
  const socket = connect(
    {
      hostname: smtpHost,
      port: smtpPort,
    },
    {
      secureTransport: 'on',
    },
  )

  const writer = socket.writable.getWriter()
  const readLine = await createLineReader(socket.readable)

  await readResponse(readLine)
  await writeLine(writer, 'EHLO daodun-cup.local')
  await readResponse(readLine)
  await writeLine(writer, 'AUTH LOGIN')
  await readResponse(readLine)
  await writeLine(writer, toBase64(user))
  await readResponse(readLine)
  await writeLine(writer, toBase64(pass))
  await readResponse(readLine)
  await writeLine(writer, `MAIL FROM:<${user}>`)
  await readResponse(readLine)
  await writeLine(writer, `RCPT TO:<${to}>`)
  await readResponse(readLine)
  await writeLine(writer, 'DATA')
  await readResponse(readLine)

  const messageId = `${crypto.randomUUID()}@daodun-cup.local`
  const payload = [
    `From: ${encodeMimeHeader('刀盾杯')} <${user}>`,
    `To: <${to}>`,
    `Subject: ${encodeMimeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${messageId}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    chunkBase64(text),
  ].join('\r\n')

  await writer.write(new TextEncoder().encode(`${payload}\r\n.\r\n`))
  await readResponse(readLine)
  await writeLine(writer, 'QUIT')
  await writer.close()
  socket.close()
}
