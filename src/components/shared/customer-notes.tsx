'use client';

import React, { useState } from 'react';
import { useTooldesk } from '@/features/context/tooldesk-context';
import { AppIcon } from './app-icon';
import type { Customer } from '@/mocks/fixtures';

export interface NoteItem {
  id: string;
  time?: string;
  content: string;
  raw: string;
}

export function parseCustomerNotes(notesStr?: string): NoteItem[] {
  if (!notesStr || !notesStr.trim()) return [];
  const text = notesStr.trim();

  // Pattern: [DD/MM/YYYY HH:mm] or [DD/MM/YYYY HH:mm:ss] or [DD/MM/YYYY]
  const pattern = /\[(\d{1,2}\/\d{1,2}\/\d{4}(?:[ ,]+(?:lúc )?\d{1,2}:\d{2}(?::\d{2})?)?)\]/g;
  const matches = [...text.matchAll(pattern)];

  if (matches.length === 0) {
    return [{
      id: 'legacy-note-0',
      time: undefined,
      content: text,
      raw: text
    }];
  }

  const items: NoteItem[] = [];

  const firstIndex = matches[0].index ?? 0;
  if (firstIndex > 0) {
    const preamble = text.slice(0, firstIndex).trim();
    if (preamble) {
      items.push({
        id: 'legacy-preamble',
        time: undefined,
        content: preamble,
        raw: preamble
      });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const time = match[1];
    const startIndex = (match.index ?? 0) + match[0].length;
    const nextMatch = matches[i + 1];
    const endIndex = nextMatch ? (nextMatch.index ?? text.length) : text.length;
    const content = text.slice(startIndex, endIndex).trim();

    items.push({
      id: `note-${i}-${time.replace(/\D/g, '')}`,
      time,
      content,
      raw: `[${time}] ${content}`
    });
  }

  return items;
}

export function CustomerNotes({
  customer,
  title = 'Lịch sử ghi chú chăm sóc'
}: {
  customer: Customer;
  title?: string;
}) {
  const { updateCustomer, addToast } = useTooldesk();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const noteItems = parseCustomerNotes(customer.notes);

  const presets = [
    'Đã gửi tài khoản',
    'Đã hướng dẫn cài đặt',
    'Khách hẹn gia hạn',
    'Cần hỗ trợ kỹ thuật',
    'Khách đã chuyển khoản'
  ];

  const handleAddPreset = (text: string) => {
    if (newNote.trim()) {
      setNewNote(prev => `${prev} · ${text}`);
    } else {
      setNewNote(text);
    }
  };

  const handleSaveNote = async () => {
    const trimmed = newNote.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      const datePart = new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh'
      }).format(now);
      const timePart = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh'
      }).format(now);
      const timestamp = `${datePart} ${timePart}`;

      const newEntry = `[${timestamp}] ${trimmed}`;
      const existing = (customer.notes || '').trim();
      const updatedNotes = existing ? `${newEntry}\n\n${existing}` : newEntry;

      await updateCustomer(customer.id, { notes: updatedNotes }, false);
      setNewNote('');
      addToast('Đã lưu ghi chú', `Đã ghi nhận lúc ${timestamp}`, 'success');
    } catch (err) {
      addToast('Lỗi lưu ghi chú', err instanceof Error ? err.message : 'Không thể lưu.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (itemToDelete: NoteItem) => {
    if (isSubmitting) return;
    const confirmDelete = window.confirm(`Bạn có chắc muốn xóa ghi chú này?\n\n"${itemToDelete.content.slice(0, 60)}..."`);
    if (!confirmDelete) return;

    setIsSubmitting(true);
    try {
      const remainingItems = noteItems.filter(item => item.id !== itemToDelete.id);
      const updatedNotes = remainingItems.map(item => item.raw).join('\n\n');

      await updateCustomer(customer.id, { notes: updatedNotes }, false);
      addToast('Đã xóa ghi chú', 'Cập nhật lịch sử thành công.', 'info');
    } catch (err) {
      addToast('Lỗi xóa ghi chú', err instanceof Error ? err.message : 'Không thể xóa.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyNote = async (item: NoteItem) => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--line)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '20px'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--line)',
        background: '#fcfcfe',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#505ad1', display: 'flex', alignItems: 'center' }}>
            <AppIcon name="clock" size={16} />
          </span>
          <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{title}</strong>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '10px',
            background: noteItems.length > 0 ? '#eff2fe' : '#f1f5f9',
            color: noteItems.length > 0 ? '#4338ca' : '#64748b'
          }}>
            {noteItems.length}
          </span>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* Preset quick chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => handleAddPreset(p)}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#eef2ff';
                e.currentTarget.style.borderColor = '#c7d2fe';
                e.currentTarget.style.color = '#3730a3';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#475569';
              }}
              title={`Chèn "${p}" vào ô ghi chú`}
            >
              + {p}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <textarea
            className="input"
            rows={2}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Nhập ghi chú chăm sóc khách hàng mới..."
            style={{
              width: '100%',
              fontSize: '12.5px',
              padding: '8px 10px',
              borderRadius: '7px',
              resize: 'vertical',
              border: '1px solid #cbd5e1',
              boxSizing: 'border-box'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSaveNote();
              }
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Nhấn Ctrl+Enter hoặc bấm nút để lưu
            </span>
            <button
              type="button"
              className="button small primary"
              disabled={!newNote.trim() || isSubmitting}
              onClick={handleSaveNote}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <AppIcon name="plus" size={13} />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu ghi chú'}</span>
            </button>
          </div>
        </div>

        {/* Timeline list of notes */}
        {noteItems.length === 0 ? (
          <div style={{
            padding: '16px 12px',
            textAlign: 'center',
            color: '#778197',
            fontSize: '12px',
            background: '#f8f9fc',
            borderRadius: '8px',
            border: '1px dashed var(--line)'
          }}>
            Chưa có ghi chú nào. Hãy nhập nội dung bên trên để ghi lại lịch sử chăm sóc khách.
          </div>
        ) : (
          <div style={{
            borderLeft: '2px solid #e2e8f0',
            marginLeft: '8px',
            paddingLeft: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {noteItems.map(item => (
              <div
                key={item.id}
                style={{
                  position: 'relative',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}
              >
                {/* Timeline Dot */}
                <span
                  style={{
                    position: 'absolute',
                    left: '-19px',
                    top: '12px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#505ad1',
                    border: '2px solid #fff',
                    boxShadow: '0 0 0 1px #505ad1'
                  }}
                />

                {/* Header of Note */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 650,
                    color: '#4338ca',
                    background: '#eef2ff',
                    padding: '2px 7px',
                    borderRadius: '5px'
                  }}>
                    {item.time ? item.time : 'Ghi chú ban đầu'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyNote(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedId === item.id ? '#15803d' : '#94a3b8',
                        cursor: 'pointer',
                        padding: '3px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                      title="Sao chép nội dung"
                    >
                      {copiedId === item.id ? 'Đã chép' : <AppIcon name="download" size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; }}
                      title="Xóa ghi chú này"
                    >
                      <AppIcon name="trash" size={12} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div style={{
                  fontSize: '12.5px',
                  color: '#334155',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {item.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
