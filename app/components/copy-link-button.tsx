'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/app/hooks/use-toast';

interface CopyLinkButtonProps {
  url: string;
  className?: string;
  variant?: 'default' | 'compact' | 'outline';
  label?: string;
}

export function CopyLinkButton({ url, className = '', variant = 'default', label }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast('Link copied to clipboard!', 'success');
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
      showToast('Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleCopy}
        className={`text-primary hover:text-primary/80 text-sm font-medium ${className}`}
        aria-live="polite"
      >
        {copied ? '✓ Copied!' : 'Copy link'}
      </button>
    );
  }

  const buttonVariant = variant === 'outline' ? 'outline' : 'default';
  const displayLabel = label || 'Copy Link';

  return (
    <Button
      onClick={handleCopy}
      variant={buttonVariant}
      className={className}
      aria-live="polite"
    >
      {copied ? (
        <>
          <Check className="h-5 w-5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-5 w-5" />
          {displayLabel}
        </>
      )}
    </Button>
  );
}
