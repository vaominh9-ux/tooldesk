'use client';

import React from 'react';

export interface ProductLogoProps {
  name?: string;
  symbol?: string;
  color?: string;
  size?: 'sm' | 'normal' | 'large';
  className?: string;
}

// Crisp, standardized vector SVG brand marks for AI tools
function OpenAILogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M20.5 12.3a4.5 4.5 0 0 0-.4-3.5 4.6 4.6 0 0 0-3.3-2.1 4.5 4.5 0 0 0-4.6-2.2 4.6 4.6 0 0 0-3.2 2.3 4.5 4.5 0 0 0-4.1 1.7 4.6 4.6 0 0 0-.7 3.9 4.5 4.5 0 0 0 .4 3.5 4.6 4.6 0 0 0 3.3 2.1 4.5 4.5 0 0 0 4.6 2.2 4.6 4.6 0 0 0 3.2-2.3 4.5 4.5 0 0 0 4.1-1.7 4.6 4.6 0 0 0 .7-3.9Zm-7.7 8.3a2.9 2.9 0 0 1-2.4-1.3l.1-.1 3.9-2.3a.8.8 0 0 0 .4-.7v-5.2l1.6.9v4.3a2.9 2.9 0 0 1-3.6 4.4Zm-7-3.8a2.9 2.9 0 0 1-.4-2.7l.1.1 3.9 2.2a.8.8 0 0 0 .8 0l4.5-2.6v1.8l-3.8 2.2a2.9 2.9 0 0 1-5.1-1Zm-1.2-7.8a2.9 2.9 0 0 1 2-1.5v4.5a.8.8 0 0 0 .4.7l4.5 2.6-1.5.9-3.8-2.2a2.9 2.9 0 0 1-1.6-5Zm13.9 3.2-4.5-2.6 1.5-.9 3.8 2.2a2.9 2.9 0 0 1 1.6 5 2.9 2.9 0 0 1-2 1.5v-4.5a.8.8 0 0 0-.4-.7Zm1.6-2.8-.1-.1-3.9-2.2a.8.8 0 0 0-.8 0l-4.5 2.6V7.9l3.8-2.2a2.9 2.9 0 0 1 5.5 2.5Zm-8.4 4.5-2-1.2 2-1.2 2 1.2-2 1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ClaudeLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M13.5 2.5h-3v5.2l-3.7-3.7-2.1 2.1 3.7 3.7H3.2v3h5.2l-3.7 3.7 2.1 2.1 3.7-3.7v5.2h3v-5.2l3.7 3.7 2.1-2.1-3.7-3.7h5.2v-3h-5.2l3.7-3.7-2.1-2.1-3.7 3.7V2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GeminiLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PerplexityLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  );
}

function CanvaLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M16.5 7.5C15 6 12.5 5.5 10.5 6.5C7.5 8 6 11 6.5 14C7 17 9.5 19 12.5 19C15.5 19 17.5 17 18 15M14 11.5c-1-.5-2.5-.5-3.5.5s-1 2.5 0 3.5 3 .5 3.5-.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MidjourneyLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 17L12 3L20 17L12 15L4 17ZM12 3V15M8 16L12 21L16 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CursorLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 2L20 6.5V17.5L12 22L4 17.5V6.5L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 2V12M12 12L20 16.5M12 12L4 16.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function DefaultAILogo({ size, label }: { size: number; label: string }) {
  if (label && label.length <= 2 && /^[A-Za-z0-9]+$/.test(label)) {
    return (
      <span
        style={{
          fontSize: size * 0.52,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#fff'
        }}
      >
        {label.toUpperCase()}
      </span>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ProductLogo({
  name = '',
  symbol = '',
  color = '',
  size = 'normal',
  className = ''
}: ProductLogoProps) {
  const normalized = name.toLowerCase().trim();

  // Size dimensions in pixels
  const pxSize = size === 'large' ? 44 : size === 'sm' ? 24 : 32;
  const iconPxSize = size === 'large' ? 24 : size === 'sm' ? 13 : 17;
  const borderRadius = size === 'large' ? 12 : size === 'sm' ? 6 : 8;

  let background = 'linear-gradient(135deg, #10a37f 0%, #0d8c6d 100%)';
  let textColor = '#ffffff';
  let content: React.ReactNode = null;

  if (normalized.includes('business') && normalized.includes('chatgpt')) {
    background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
    content = <OpenAILogo size={iconPxSize} />;
  } else if (normalized.includes('chatgpt') || normalized.includes('openai') || normalized.includes('gpt')) {
    background = 'linear-gradient(135deg, #10a37f 0%, #0a8164 100%)';
    content = <OpenAILogo size={iconPxSize} />;
  } else if (normalized.includes('claude') || normalized.includes('anthropic')) {
    background = 'linear-gradient(135deg, #d97757 0%, #c46243 100%)';
    content = <ClaudeLogo size={iconPxSize} />;
  } else if (normalized.includes('gemini') || normalized.includes('google')) {
    background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #7c3aed 100%)';
    content = <GeminiLogo size={iconPxSize} />;
  } else if (normalized.includes('perplexity')) {
    background = 'linear-gradient(135deg, #164e63 0%, #0891b2 100%)';
    content = <PerplexityLogo size={iconPxSize} />;
  } else if (normalized.includes('canva')) {
    background = 'linear-gradient(135deg, #00c4cc 0%, #7d2ae8 100%)';
    content = <CanvaLogo size={iconPxSize} />;
  } else if (normalized.includes('midjourney')) {
    background = 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)';
    content = <MidjourneyLogo size={iconPxSize} />;
  } else if (normalized.includes('cursor')) {
    background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
    content = <CursorLogo size={iconPxSize} />;
  } else {
    // Custom / Generic products: map by color or initial
    const colorMap: Record<string, string> = {
      mint: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      emerald: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      peach: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      blue: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      aqua: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      purple: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      indigo: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      rose: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
    };
    background = colorMap[color] || 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
    const monogram = name ? name.trim().slice(0, 2) : symbol || 'AI';
    content = <DefaultAILogo size={iconPxSize} label={monogram} />;
  }

  return (
    <span
      className={`product-logo-mark ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: pxSize,
        height: pxSize,
        minWidth: pxSize,
        borderRadius,
        background,
        color: textColor,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        flexShrink: 0,
        userSelect: 'none',
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      {content}
    </span>
  );
}
