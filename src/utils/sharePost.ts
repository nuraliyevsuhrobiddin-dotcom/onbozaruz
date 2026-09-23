export function getPostShareUrl(postId: string) {
  const origin = typeof window === 'undefined' ? 'https://onbozar.uz' : window.location.origin;
  return `${origin}/?post=${encodeURIComponent(postId)}`;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    try {
      input.select();
      if (!document.execCommand('copy')) throw new Error('Nusxalab bo‘lmadi');
    } finally {
      input.remove();
    }
  }
}
