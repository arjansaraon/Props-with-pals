'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Check, Copy } from 'lucide-react';

interface CopyLinkButtonProps {
  url: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export function CopyLinkButton({ url, className = '', variant = 'default' }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleCopy}
        className={`text-primary hover:text-primary/80 text-sm font-medium ${className}`}
      >
        {copied ? '✓ Copied!' : 'Copy link'}
      </button>
    );
  }

  return (
    <Button
      onClick={handleCopy}
      className={className}
    >
      {copied ? (
        <>
          <Check className="h-5 w-5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-5 w-5" />
          Copy Link
        </>
      )}
    </Button>
  );
}
