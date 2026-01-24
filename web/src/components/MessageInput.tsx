import { FormEvent, useState } from 'react';

interface Props {
  disabled?: boolean;
  onSend: (text: string) => Promise<void> | void;
}

export function MessageInput({ disabled, onSend }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || disabled || sending) return;
    setSending(true);
    try {
      await onSend(value);
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Contale a Movio qué comiste, qué vas a hacer..."
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={disabled || sending}
      />
      <button type="submit" disabled={disabled || sending}>
        Enviar
      </button>
    </form>
  );
}

