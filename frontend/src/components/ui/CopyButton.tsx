import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './Button'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="secondary" size="sm" onClick={copy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copiado' : 'Copiar'}
    </Button>
  )
}
