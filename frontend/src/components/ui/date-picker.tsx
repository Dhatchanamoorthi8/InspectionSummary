import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  IconButton,
  Input,
  SimpleGrid,
  Field,
  HStack,
} from '@chakra-ui/react';
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from './popover';
import { useColorModeValue } from './color-mode';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface DatePickerProps {
  id?: string;
  label?: string;
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  isRequired?: boolean;
  required?: boolean;
  isInvalid?: boolean;
  invalid?: boolean;
  errorMessage?: string;
  helperText?: string;
  isDisabled?: boolean;
  disabled?: boolean;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  size?: 'xs' | 'sm' | 'md';
  w?: string | object;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type ViewMode = 'day' | 'month' | 'year';

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  isRequired = false,
  required,
  isInvalid = false,
  invalid,
  errorMessage,
  helperText,
  isDisabled = false,
  disabled,
  placeholder = 'Select date (YYYY-MM-DD)',
  minDate,
  maxDate,
  size = 'sm',
  w = 'full',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

  const isFieldRequired = required ?? isRequired;
  const isFieldInvalid = invalid ?? isInvalid;
  const isFieldDisabled = disabled ?? isDisabled;

  // Timezone-safe initial year & month parse
  const getInitialYearMonth = () => {
    if (value && value.includes('-')) {
      const [vy, vm] = value.split('-').map(Number);
      if (!isNaN(vy) && !isNaN(vm) && vm >= 1 && vm <= 12) {
        return { year: vy, month: vm - 1 };
      }
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  };

  const initial = getInitialYearMonth();
  const [currentYear, setCurrentYear] = useState(initial.year);
  const [currentMonth, setCurrentMonth] = useState(initial.month);
  const [decadeStart, setDecadeStart] = useState<number>(
    Math.floor(initial.year / 10) * 10 - 1
  );

  useEffect(() => {
    if (value && value.includes('-')) {
      const [vy, vm] = value.split('-').map(Number);
      if (!isNaN(vy) && !isNaN(vm) && vm >= 1 && vm <= 12) {
        setCurrentYear(vy);
        setCurrentMonth(vm - 1);
        setDecadeStart(Math.floor(vy / 10) * 10 - 1);
      }
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      setViewMode('day');
      setDecadeStart(Math.floor(currentYear / 10) * 10 - 1);
    }
  }, [isOpen]);

  const inputBg = useColorModeValue('white', 'gray.900');
  const inputBorder = useColorModeValue('industrial.300', 'gray.600');
  const inputHoverBorder = useColorModeValue('industrial.400', 'gray.500');
  const inputTextColor = useColorModeValue('industrial.900', 'gray.100');
  const labelColor = useColorModeValue('industrial.700', 'gray.300');
  const popoverBg = useColorModeValue('white', 'gray.800');
  const popoverBorder = useColorModeValue('industrial.200', 'gray.700');
  const headerTextColor = useColorModeValue('industrial.900', 'white');
  const dayNameColor = useColorModeValue('gray.400', 'gray.500');
  const activeDayBg = useColorModeValue('brand.500', 'brand.600');
  const todayBorderColor = useColorModeValue('brand.500', 'brand.400');
  const hoverDayBg = useColorModeValue('industrial.100', 'gray.700');
  const otherMonthTextColor = useColorModeValue('gray.300', 'gray.600');
  const currentMonthTextColor = useColorModeValue('industrial.900', 'gray.100');

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    if (minDate && dateStr < minDate) return;
    if (maxDate && dateStr > maxDate) return;

    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(today.getDate()).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${formattedMonth}-${formattedDay}`;

    onChange(dateStr);
    setIsOpen(false);
  };

  // Calendar matrix calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays: Array<{
    day: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
  }> = [];

  // Previous month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill grid to multiple of 7
  const remainingDays = (7 - (calendarDays.length % 7)) % 7;
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      day: i,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  const today = new Date();
  const isToday = (y: number, m: number, d: number) => {
    return (
      today.getFullYear() === y &&
      today.getMonth() === m &&
      today.getDate() === d
    );
  };

  const isSelectedDate = (y: number, m: number, d: number) => {
    if (!value) return false;
    const [vy, vm, vd] = value.split('-').map(Number);
    return vy === y && vm === m + 1 && vd === d;
  };

  return (
    <Field.Root
      id={id}
      required={isFieldRequired}
      invalid={isFieldInvalid}
      disabled={isFieldDisabled}
      w={w}
    >
      {label && (
        <Field.Label fontSize="xs" fontWeight="700" color={labelColor} mb={1.5}>
          {label}
        </Field.Label>
      )}

      <PopoverRoot
        open={isOpen}
        onOpenChange={(e) => setIsOpen(e.open)}
        positioning={{ placement: 'bottom-start' }}
      >
        <PopoverTrigger asChild>
          <Box
            cursor={isFieldDisabled ? 'not-allowed' : 'pointer'}
            position="relative"
            w="full"
          >
            <Input
              id={id}
              size={size}
              h={size === 'xs' ? '28px' : size === 'sm' ? '32px' : '40px'}
              value={value || ''}
              readOnly
              placeholder={placeholder}
              disabled={isFieldDisabled}
              bg={inputBg}
              border="1px solid"
              borderColor={isFieldInvalid ? 'red.500' : inputBorder}
              color={inputTextColor}
              borderRadius="md"
              cursor={isFieldDisabled ? 'not-allowed' : 'pointer'}
              fontSize="xs"
              fontWeight="500"
              pr={value && !isFieldDisabled ? 14 : 8}
              _hover={{
                borderColor: isFieldInvalid ? 'red.500' : inputHoverBorder,
              }}
              _focus={{
                borderColor: isFieldInvalid ? 'red.500' : 'brand.500',
                boxShadow: '0 0 0 1px #2563EB',
              }}
              _focusVisible={{
                outline: 'none',
                borderColor: isFieldInvalid ? 'red.500' : 'brand.500',
                boxShadow: '0 0 0 1px #2563EB',
              }}
            />
            <HStack
              position="absolute"
              right={2.5}
              top="50%"
              transform="translateY(-50%)"
              gap={1.5}
              align="center"
            >
              {value && !isFieldDisabled && (
                <IconButton
                  aria-label="Clear date"
                  size="2xs"
                  variant="ghost"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  color="gray.400"
                  _hover={{ color: 'red.500', bg: 'transparent' }}
                  h="18px"
                  w="18px"
                  minW="18px"
                  p={0}
                >
                  <X size={12} />
                </IconButton>
              )}
              <Flex pointerEvents="none" align="center" justify="center">
                <Calendar size={14} color={isFieldInvalid ? '#E53E3E' : '#718096'} />
              </Flex>
            </HStack>
          </Box>
        </PopoverTrigger>

        <PopoverContent
          bg={popoverBg}
          borderColor={popoverBorder}
          boxShadow="lg"
          borderRadius="lg"
          p={3}
          w="300px"
          zIndex={1600}
        >
          <PopoverBody p={0}>
            {/* ========================================================= */}
            {/* VIEW 1: DAY VIEW (Calendar Grid)                           */}
            {/* ========================================================= */}
            {viewMode === 'day' && (
              <>
                {/* Header: Month / Year Navigation */}
                <Flex justify="space-between" align="center" mb={2}>
                  <IconButton
                    aria-label="Previous Month"
                    size="xs"
                    variant="ghost"
                    onClick={handlePrevMonth}
                    ref={initialFocusRef}
                  >
                    <ChevronLeft size={16} />
                  </IconButton>

                  {/* Clickable Month & Year Switchers */}
                  <HStack gap={1}>
                    <Button
                      size="xs"
                      variant="ghost"
                      fontWeight="700"
                      fontSize="xs"
                      color={headerTextColor}
                      onClick={() => setViewMode('month')}
                      _hover={{ bg: hoverDayBg }}
                      px={2}
                      h="26px"
                      borderRadius="md"
                    >
                      {MONTH_NAMES[currentMonth]}
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      fontWeight="700"
                      fontSize="xs"
                      color={headerTextColor}
                      onClick={() => setViewMode('year')}
                      _hover={{ bg: hoverDayBg }}
                      px={2}
                      h="26px"
                      borderRadius="md"
                    >
                      {currentYear}
                    </Button>
                  </HStack>

                  <IconButton
                    aria-label="Next Month"
                    size="xs"
                    variant="ghost"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight size={16} />
                  </IconButton>
                </Flex>

                {/* Weekday Row */}
                <SimpleGrid columns={7} gap={1} mb={1} textAlign="center">
                  {WEEKDAY_NAMES.map((name) => (
                    <Text
                      key={name}
                      fontSize="2xs"
                      fontWeight="700"
                      color={dayNameColor}
                      textTransform="uppercase"
                    >
                      {name}
                    </Text>
                  ))}
                </SimpleGrid>

                {/* Calendar Days Grid */}
                <SimpleGrid columns={7} gap={1}>
                  {calendarDays.map((cal, idx) => {
                    const selected = isSelectedDate(cal.year, cal.month, cal.day);
                    const current = isToday(cal.year, cal.month, cal.day);
                    const formattedMonth = String(cal.month + 1).padStart(2, '0');
                    const formattedDay = String(cal.day).padStart(2, '0');
                    const dateStr = `${cal.year}-${formattedMonth}-${formattedDay}`;
                    const isOutOfRange =
                      (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);

                    return (
                      <Button
                        key={idx}
                        size="xs"
                        h="30px"
                        w="30px"
                        p={0}
                        variant={selected ? 'solid' : 'ghost'}
                        colorPalette={selected ? 'blue' : undefined}
                        bg={selected ? activeDayBg : undefined}
                        color={
                          selected
                            ? 'white'
                            : cal.isCurrentMonth
                            ? currentMonthTextColor
                            : otherMonthTextColor
                        }
                        borderWidth={current && !selected ? '1px' : '0px'}
                        borderColor={current && !selected ? todayBorderColor : undefined}
                        fontWeight={selected || current ? '700' : '400'}
                        fontSize="xs"
                        borderRadius="md"
                        disabled={Boolean(isOutOfRange)}
                        _hover={{
                          bg: selected ? activeDayBg : hoverDayBg,
                        }}
                        onClick={() => handleSelectDay(cal.year, cal.month, cal.day)}
                      >
                        {cal.day}
                      </Button>
                    );
                  })}
                </SimpleGrid>
              </>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: MONTH VIEW (Jan - Dec 12 Month Grid)               */}
            {/* ========================================================= */}
            {viewMode === 'month' && (
              <>
                <Flex justify="space-between" align="center" mb={2}>
                  <IconButton
                    aria-label="Previous Year"
                    size="xs"
                    variant="ghost"
                    onClick={() => setCurrentYear((y) => y - 1)}
                  >
                    <ChevronLeft size={16} />
                  </IconButton>

                  <Button
                    size="xs"
                    variant="ghost"
                    fontWeight="700"
                    fontSize="xs"
                    color={headerTextColor}
                    onClick={() => setViewMode('year')}
                    _hover={{ bg: hoverDayBg }}
                    px={3}
                    h="26px"
                    borderRadius="md"
                  >
                    {currentYear}
                  </Button>

                  <IconButton
                    aria-label="Next Year"
                    size="xs"
                    variant="ghost"
                    onClick={() => setCurrentYear((y) => y + 1)}
                  >
                    <ChevronRight size={16} />
                  </IconButton>
                </Flex>

                <SimpleGrid columns={4} gap={2} py={2}>
                  {MONTH_SHORT_NAMES.map((mName, idx) => {
                    const isSelectedMonth = idx === currentMonth;
                    return (
                      <Button
                        key={mName}
                        size="xs"
                        h="36px"
                        variant={isSelectedMonth ? 'outline' : 'ghost'}
                        colorPalette={isSelectedMonth ? 'blue' : undefined}
                        borderColor={isSelectedMonth ? 'brand.500' : 'transparent'}
                        borderWidth="1px"
                        fontWeight={isSelectedMonth ? '700' : '500'}
                        fontSize="xs"
                        borderRadius="md"
                        onClick={() => {
                          setCurrentMonth(idx);
                          setViewMode('day');
                        }}
                        _hover={{
                          bg: isSelectedMonth ? undefined : hoverDayBg,
                        }}
                      >
                        {mName}
                      </Button>
                    );
                  })}
                </SimpleGrid>
              </>
            )}

            {/* ========================================================= */}
            {/* VIEW 3: YEAR VIEW (12-Year Decade Grid)                    */}
            {/* ========================================================= */}
            {viewMode === 'year' && (
              <>
                <Flex justify="space-between" align="center" mb={2}>
                  <IconButton
                    aria-label="Previous Decade"
                    size="xs"
                    variant="ghost"
                    onClick={() => setDecadeStart((d) => d - 10)}
                  >
                    <ChevronLeft size={16} />
                  </IconButton>

                  <Text fontSize="xs" fontWeight="700" color={headerTextColor}>
                    {decadeStart + 1} - {decadeStart + 10}
                  </Text>

                  <IconButton
                    aria-label="Next Decade"
                    size="xs"
                    variant="ghost"
                    onClick={() => setDecadeStart((d) => d + 10)}
                  >
                    <ChevronRight size={16} />
                  </IconButton>
                </Flex>

                <SimpleGrid columns={4} gap={2} py={2}>
                  {Array.from({ length: 12 }, (_, i) => decadeStart + i).map((y) => {
                    const isSelectedYear = y === currentYear;
                    const isOutsideDecade = y <= decadeStart || y > decadeStart + 10;
                    return (
                      <Button
                        key={y}
                        size="xs"
                        h="36px"
                        variant={isSelectedYear ? 'outline' : 'ghost'}
                        colorPalette={isSelectedYear ? 'blue' : undefined}
                        borderColor={isSelectedYear ? 'brand.500' : 'transparent'}
                        borderWidth="1px"
                        color={
                          isSelectedYear
                            ? 'brand.600'
                            : isOutsideDecade
                            ? otherMonthTextColor
                            : headerTextColor
                        }
                        fontWeight={isSelectedYear ? '700' : '500'}
                        fontSize="xs"
                        borderRadius="md"
                        onClick={() => {
                          setCurrentYear(y);
                          setViewMode('month');
                        }}
                        _hover={{
                          bg: isSelectedYear ? undefined : hoverDayBg,
                        }}
                      >
                        {y}
                      </Button>
                    );
                  })}
                </SimpleGrid>
              </>
            )}

            {/* Footer Quick Action: Select Today & Clear */}
            <Flex justify="space-between" align="center" mt={3} pt={2} borderTopWidth="1px" borderColor={popoverBorder}>
              <Button
                size="xs"
                variant="plain"
                colorPalette="blue"
                onClick={handleSelectToday}
              >
                Today
              </Button>
              {viewMode !== 'day' && (
                <Button
                  size="xs"
                  variant="plain"
                  colorPalette="blue"
                  onClick={() => setViewMode('day')}
                >
                  Back to Calendar
                </Button>
              )}
              {value && (
                <Button
                  size="xs"
                  variant="plain"
                  colorPalette="gray"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                >
                  Clear
                </Button>
              )}
            </Flex>
          </PopoverBody>
        </PopoverContent>
      </PopoverRoot>

      {isFieldInvalid && errorMessage && (
        <Field.ErrorText fontSize="2xs" mt={1}>
          {errorMessage}
        </Field.ErrorText>
      )}
      {!isFieldInvalid && helperText && (
        <Field.HelperText fontSize="2xs" mt={1} color="gray.500">
          {helperText}
        </Field.HelperText>
      )}
    </Field.Root>
  );
};

export default DatePicker;
