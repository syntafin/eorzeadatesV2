import { defineEventHandler, readMultipartFormData, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Serverfehler',
      message: 'DISCORD_WEBHOOK_URL ist nicht gesetzt.'
    })
  }

  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Formulardaten fehlen.' })
  }

  const fields: Record<string, string> = {}
  let imagePart: { filename: string; type: string; data: Buffer } | null = null

  for (const part of form) {
    if (part.type) {
      // Datei
      if (part.name === 'image') {
        imagePart = {
          filename: part.filename || 'upload',
          type: part.type,
          data: part.data as Buffer
        }
      }
    } else {
      fields[part.name] = (part.data as Buffer).toString('utf-8')
    }
  }

  // Validierung
  const name = (fields['name'] || '').trim()
  const world = (fields['world'] || '').trim()
  const datacenter = (fields['datacenter'] || '').trim()

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Name is required!' })
  }
  if (!imagePart) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Image is required!' })
  }
  const allowed = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowed.includes(imagePart.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Allowed formats: PNG, JPEG/JPG, WebP.' })
  }
  const maxBytes = 8 * 1024 * 1024
  if (imagePart.data.byteLength > maxBytes) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Image filesize to big (max. 20 MB).' })
  }

  // Discord-Webhook (Forum): Erstelle neuen Thread mit thread_name und initialer Nachricht + Anhang
  // Discord erwartet multipart/form-data mit "payload_json" und "files[0]"
  const payload = {
    content: [
      `New submission from ${name}`,
      datacenter ? `Datecenter: ${datacenter}` : null,
      world ? `World: ${world}` : null,
    ].filter(Boolean).join('\n'),
    // thread_name erzeugt im Forum-Kanal einen neuen Thread
    thread_name: `Submission from ${name}`
  }

  // Nutzt die in Node/undici verfügbare FormData/Blob
  const fd = new FormData()
  fd.append('payload_json', JSON.stringify(payload))
  // Benutze denselben Index wie Discord erwartet: files[0]
  const blob = new Blob([imagePart.data], { type: imagePart.type })
  fd.append('files[0]', blob, imagePart.filename)

  const res = await fetch(webhookUrl, {
    method: 'POST',
    body: fd
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: `Discord Webhook fehlgeschlagen (${res.status}): ${errText || 'Unbekannter Fehler'}`
    })
  }

  return { ok: true }
})
