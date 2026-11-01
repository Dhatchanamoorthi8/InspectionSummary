'use client';

import React, { useMemo } from 'react';
import { DatePicker, Portal } from '@chakra-ui/react';
import { LuCalendar } from 'react-icons/lu';
import { parseDate, CalendarDate, DateValue } from '@internationalized/date';

export interface ChakraDateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onRangeChange: (start: string, end: string) => void;
  label?: string;
  placeholderStart?: string;
  placeholderEnd?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  maxWidth?: string | object;
}

/**
 * Robust date parser supporting ISO (YYYY-MM-DD), MM/DD/YYYY, and DD/MM/YYYY
 */
export function safeParseDate(str?: string): DateValue | null {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // 1. Try standard ISO (YYYY-MM-DD)
  try {
    return parseDate(trimmed);
  } catch {}

  // 2. Try delimited formats (YYYY/MM/DD, MM/DD/YYYY, DD/MM/YYYY)
  const parts = trimmed.split(/[-/.]/);
  if (parts.length === 3) {
    // YYYY-MM-DD
    if (parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        try {
          return new CalendarDate(y, m, d);
        } catch {}
      }
    }
    // MM/DD/YYYY or DD/MM/YYYY
    if (parts[2].length === 4) {
      const y = parseInt(parts[2], 10);
      const n1 = parseInt(parts[0], 10);
      const n2 = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(n1) && !isNaN(n2)) {
        // If first number > 12, it must be DD/MM/YYYY
        if (n1 > 12) {
          try {
            return new CalendarDate(y, n2, n1);
          } catch {}
        }
        // Otherwise default to MM/DD/YYYY
        try {
          return new CalendarDate(y, n1, n2);
        } catch {}
      }
    }
  }

  return null;
}

export const ChakraDateRangePicker: React.FC<ChakraDateRangePickerProps> = ({
  startDate,
  endDate,
  onRangeChange,
  label,
  placeholderStart = 'From date',
  placeholderEnd = 'To date',
  size = 'xs',
  maxWidth = '19rem',
}) => {
  const value = useMemo(() => {
    const list: DateValue[] = [];
    const d1 = safeParseDate(startDate);
    if (d1) list.push(d1);
    const d2 = safeParseDate(endDate);
    if (d2) list.push(d2);
    return list;
  }, [startDate, endDate]);

  return (
    <DatePicker.Root
      selectionMode="range"
      maxWidth={maxWidth}
      size={size}
      value={value}
      format={(date) => (date ? date.toString() : '')}
      parse={(val) => safeParseDate(val) ?? undefined}
      onValueChange={(details) => {
        // Extract standard ISO string YYYY-MM-DD from DateValue objects
        const start = details.value[0] ? details.value[0].toString() : '';
        const end = details.value[1] ? details.value[1].toString() : '';
        onRangeChange(start, end);
      }}
    >
      {label && <DatePicker.Label>{label}</DatePicker.Label>}
      <DatePicker.Control>
        <DatePicker.Input index={0} placeholder={placeholderStart} />
        <DatePicker.Input index={1} placeholder={placeholderEnd} />
        <DatePicker.IndicatorGroup>
          <DatePicker.ClearTrigger />
          <DatePicker.Trigger>
            <LuCalendar />
          </DatePicker.Trigger>
        </DatePicker.IndicatorGroup>
      </DatePicker.Control>
      <Portal>
        <DatePicker.Positioner>
          <DatePicker.Content
            bg="bg.panel"
            p={3}
            borderRadius="md"
            boxShadow="lg"
            borderWidth="1px"
            borderColor="border.subtle"
            zIndex="popover"
          >
            <DatePicker.View view="day">
              <DatePicker.Header />
              <DatePicker.DayTable />
            </DatePicker.View>
            <DatePicker.View view="month">
              <DatePicker.Header />
              <DatePicker.MonthTable />
            </DatePicker.View>
            <DatePicker.View view="year">
              <DatePicker.Header />
              <DatePicker.YearTable />
            </DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </Portal>
    </DatePicker.Root>
  );
};
