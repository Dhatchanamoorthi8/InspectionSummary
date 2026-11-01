import React from 'react';
import {
  Box,
  Flex,
  HStack,
  Text,
  Heading,
  IconButton,
  Button,
  Badge,
  Icon,
} from '@chakra-ui/react';
import {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
} from './ui/menu';
import { Avatar } from './ui/avatar';
import { useColorMode, useColorModeValue } from './ui/color-mode';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Tooltip } from './ui';

interface HeaderProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
  onOpenSignatureModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileMenu,
  onOpenSignatureModal,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const isPE = user?.role === 'PRODUCTION_ENGINEER';

  const headerBg = useColorModeValue('white', 'gray.900');
  const headerBorderColor = useColorModeValue('gray.200', 'gray.800');
  const titleColor = useColorModeValue('gray.900', 'white');
  const iconBtnColor = useColorModeValue('gray.700', 'gray.200');
  const iconBtnHover = useColorModeValue('gray.100', 'gray.800');
  const menuListBg = useColorModeValue('white', 'gray.800');
  const menuHeaderBg = useColorModeValue('gray.50', 'gray.750');

  const getPageTitle = (): { title: string; category?: string } => {
    const path = location.pathname;
    const search = location.search;

    if (path === '/production/dashboard') {
      return { title: 'Production Overview', category: 'Dashboard' };
    }
    if (path === '/inspector/dashboard') {
      return { title: 'Quality Inspection Workspace', category: 'Dashboard' };
    }
    if (path === '/requests') {
      if (search.includes('status=Completed')) {
        return { title: 'Completed Inspections', category: 'Quality Records' };
      }
      return { title: 'Inspection Requests', category: 'Workflow' };
    }
    if (path.startsWith('/requests/')) {
      return { title: 'Inspection Request Detail', category: 'Workflow' };
    }
    if (path.startsWith('/tasks') && path.endsWith('/inspect')) {
      return { title: 'Inspection Report Entry', category: 'QC Execution' };
    }
    if (path === '/tasks') {
      if (search.includes('status=Completed')) {
        return { title: 'Completed Tasks', category: 'Quality Records' };
      }
      return { title: 'Assigned Inspection Tasks', category: 'QC Execution' };
    }
    if (path === '/parts') {
      if (search.includes('import=true')) {
        return { title: 'Bulk Master Data Upload', category: 'Master Data' };
      }
      return { title: 'Part Master Data Management', category: 'Master Data' };
    }
    if (path === '/reports/summary') {
      return { title: 'Daily Inspection Summary Pivot Report', category: 'Quality Reports' };
    }
    if (path === '/audit-log') {
      return { title: 'Immutable Audit Trail', category: 'Compliance' };
    }
    if (path === '/users') {
      return { title: 'User & Access Management', category: 'Administration' };
    }

    return { title: 'Industrial Inspection Platform' };
  };

  const { title, category } = getPageTitle();

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={30}
      bg={headerBg}
      borderBottomWidth="1px"
      borderColor={headerBorderColor}
      h="60px"
      px={{ base: 3, sm: 4, md: 6 }}
      boxShadow="0 1px 3px 0 rgba(0, 0, 0, 0.05)"
      className="no-print"
      transition="background-color 0.2s, border-color 0.2s"
    >
      <Flex justify="space-between" align="center" h="full">
        {/* Left: Navigation toggles & Dynamic Page Title / Breadcrumb */}
        <HStack gap={{ base: 2, md: 3 }}>
          {/* Mobile drawer hamburger toggle */}
          <Tooltip label="Open menu" placement="bottom" hasArrow>
            <IconButton
              display={{ base: 'flex', lg: 'none' }}
              aria-label="Open navigation menu"
              onClick={onOpenMobileMenu}
              variant="ghost"
              size="sm"
              color={iconBtnColor}
              _hover={{ bg: iconBtnHover }}
            >
              <MenuIcon size={20} />
            </IconButton>
          </Tooltip>

          {/* Desktop sidebar collapse toggle */}
          <Tooltip
            label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            placement="bottom"
            hasArrow
          >
            <IconButton
              display={{ base: 'none', lg: 'flex' }}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={onToggleSidebar}
              variant="ghost"
              size="sm"
              color={iconBtnColor}
              _hover={{ bg: iconBtnHover }}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </IconButton>
          </Tooltip>

          {/* Breadcrumb & Title */}
          <Box>
            {category && (
              <Text
                fontSize="2xs"
                fontWeight="700"
                color="gray.400"
                textTransform="uppercase"
                letterSpacing="wider"
                lineHeight="1"
                mb={0.5}
                display={{ base: 'none', sm: 'block' }}
              >
                {category}
              </Text>
            )}
            <Heading
              as="h1"
              fontSize={{ base: 'sm', sm: 'md', md: 'lg' }}
              fontWeight="800"
              color={titleColor}
              lineHeight="1.2"
              maxW={{ base: '180px', sm: '320px', md: '500px' }}
            >
              {title}
            </Heading>
          </Box>
        </HStack>

        {/* Right: Color mode toggle & User profile menu */}
        <HStack gap={{ base: 2, md: 3 }}>
          {/* Light / Dark Mode Toggle */}
          <Tooltip
            label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            placement="bottom"
            hasArrow
          >
            <IconButton
              aria-label="Toggle light or dark color mode"
              onClick={toggleColorMode}
              variant="ghost"
              size="sm"
              color={iconBtnColor}
              _hover={{ bg: iconBtnHover }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>
          </Tooltip>

          {/* Profile Menu */}
          <MenuRoot positioning={{ placement: 'bottom-end' }}>
            <MenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                p={1}
                borderRadius="full"
                _hover={{ bg: iconBtnHover }}
              >
                <HStack gap={2}>
                  <Avatar
                    size="sm"
                    name={user?.fullName || user?.username}
                    bg="brand.500"
                    color="white"
                  />
                  <Box textAlign="left" display={{ base: 'none', md: 'block' }} pr={1}>
                    <Text fontSize="xs" fontWeight="700" color={titleColor} lineHeight="1.1">
                      {user?.fullName || user?.username}
                    </Text>
                    <Text fontSize="2xs" color="gray.500">
                      {isPE ? 'Production Eng' : 'Quality Inspector'}
                    </Text>
                  </Box>
                </HStack>
              </Button>
            </MenuTrigger>

            <MenuContent
              bg={menuListBg}
              borderColor={headerBorderColor}
              boxShadow="lg"
              py={1}
              zIndex={100}
            >
              <Box px={3} py={2} bg={menuHeaderBg} borderBottomWidth="1px" borderColor={headerBorderColor}>
                <Text fontSize="xs" fontWeight="700" color={titleColor}>
                  {user?.fullName}
                </Text>
                <Text fontSize="2xs" color="gray.500">
                  @{user?.username}
                </Text>
                <Badge
                  colorPalette={isPE ? 'blue' : 'green'}
                  fontSize="2xs"
                  mt={1}
                  textTransform="uppercase"
                >
                  {user?.role?.replace('_', ' ')}
                </Badge>
              </Box>

              <MenuItem
                value="signature"
                fontSize="xs"
                onClick={onOpenSignatureModal}
              >
                <Icon as={PenTool} boxSize={4} color="gray.500" mr={2} />
                {user?.signatureData ? 'Manage Digital Signature' : 'Add Digital Signature'}
              </MenuItem>

              {user?.canManageUsers && (
                <MenuItem
                  value="users"
                  fontSize="xs"
                  asChild
                >
                  <RouterLink to="/users">
                    <Icon as={ShieldCheck} boxSize={4} color="gray.500" mr={2} />
                    Users and Permissions
                  </RouterLink>
                </MenuItem>
              )}

              <MenuSeparator />

              <MenuItem
                value="logout"
                fontSize="xs"
                color="red.600"
                onClick={logout}
              >
                <Icon as={LogOut} boxSize={4} color="red.500" mr={2} />
                Logout
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </HStack>
      </Flex>
    </Box>
  );
};
