import React from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Icon,
  Button,
  IconButton,
} from '@chakra-ui/react';
import { Avatar } from './ui/avatar';
import { useColorModeValue } from './ui/color-mode';
import { Tooltip } from './ui/tooltip';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Flame,
  LayoutDashboard,
  ClipboardList,
  Layers,
  Users,
  FileCheck,
  FileSpreadsheet,
  History,
  LogOut,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSignatureModal?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  exact?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isPE = user?.role === 'PRODUCTION_ENGINEER';

  const peNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/production/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Requests', path: '/requests', icon: ClipboardList, exact: true },
    { label: 'Part Master', path: '/parts', icon: Layers, exact: true },
    ...(user?.canManageUsers
      ? [{ label: 'Users and Permissions', path: '/users', icon: Users, exact: true }]
      : []),
    { label: 'Completed Reports', path: '/requests?status=Completed', icon: FileCheck },
    { label: 'Summary Report', path: '/reports/summary', icon: FileSpreadsheet, exact: true },
    { label: 'Audit Logs', path: '/audit-logs', icon: History, exact: true },
  ];

  const qiNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/inspector/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Assigned Tasks', path: '/tasks', icon: ClipboardList, exact: true },
    { label: 'Completed Reports', path: '/tasks?status=Completed', icon: FileCheck },
    { label: 'Summary Report', path: '/reports/summary', icon: FileSpreadsheet, exact: true },
  ];

  const navItems = isPE ? peNavItems : qiNavItems;

  const isItemActive = (item: NavItem) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    const currentFull = currentPath + currentSearch;

    if (item.path.includes('?')) {
      return currentFull === item.path;
    }

    if (item.path === '/requests') {
      if (currentSearch.includes('status=Completed')) {
        return false;
      }
      return currentPath === '/requests';
    }

    if (item.path === '/parts') {
      if (currentSearch.includes('import=true')) {
        return false;
      }
      return currentPath === '/parts';
    }

    if (item.path === '/tasks') {
      if (currentSearch.includes('status=Completed')) {
        return false;
      }
      return currentPath === '/tasks';
    }

    if (item.exact) {
      return currentPath === item.path;
    }

    return currentPath.startsWith(item.path);
  };

  const sidebarBg = useColorModeValue('white', 'gray.900');
  const sidebarBorder = useColorModeValue('gray.200', 'gray.800');
  const sidebarBottomBg = useColorModeValue('gray.50', 'gray.900');
  const userCardBg = useColorModeValue('gray.100', 'gray.800');
  const brandTitleColor = useColorModeValue('gray.900', 'white');
  const brandSubColor = useColorModeValue('gray.500', 'gray.400');
  const navInactiveColor = useColorModeValue('gray.700', 'gray.300');
  const navInactiveHoverBg = useColorModeValue('gray.100', 'gray.800');
  const navInactiveHoverColor = useColorModeValue('gray.900', 'white');
  const navIconColor = useColorModeValue('gray.500', 'gray.400');
  const userNameColor = useColorModeValue('gray.900', 'white');
  const userRoleColor = useColorModeValue('gray.500', 'gray.400');
  const logoutColor = useColorModeValue('gray.600', 'gray.400');
  const logoutHoverBg = useColorModeValue('red.50', 'red.900');
  const logoutHoverColor = useColorModeValue('red.600', 'red.200');

  return (
    <Box
      as="aside"
      display={{ base: 'none', lg: 'flex' }}
      flexDirection="column"
      position="fixed"
      top={0}
      left={0}
      bottom={0}
      w={isCollapsed ? '68px' : '240px'}
      minW={isCollapsed ? '68px' : '240px'}
      maxW={isCollapsed ? '68px' : '240px'}
      h="100vh"
      bg={sidebarBg}
      color={navInactiveColor}
      borderRight="1px solid"
      borderColor={sidebarBorder}
      transition="width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      zIndex={100}
      overflow="hidden"
      className="no-print"
    >
      {/* Brand Header */}
      <Flex
        align="center"
        justify={isCollapsed ? 'center' : 'space-between'}
        h="64px"
        flexShrink={0}
        px={isCollapsed ? 2 : 4}
        borderBottom="1px solid"
        borderColor={sidebarBorder}
      >
        {!isCollapsed ? (
          <RouterLink
            to={isPE ? '/production/dashboard' : '/inspector/dashboard'}
            style={{ textDecoration: 'none', overflow: 'hidden' }}
          >
            <HStack gap={2.5} overflow="hidden">
              <Flex
                w={8}
                h={8}
                borderRadius="md"
                bg="orange.500"
                align="center"
                justify="center"
                flexShrink={0}
              >
                <Icon as={Flame} boxSize={5} color="white" />
              </Flex>
              <Box overflow="hidden">
                <Text
                  fontSize="sm"
                  fontWeight="800"
                  letterSpacing="wider"
                  lineHeight="1.1"
                  whiteSpace="nowrap"
                  color={brandTitleColor}
                >
                  INDUSTRIAL QC
                </Text>
                <Text
                  fontSize="9px"
                  color={brandSubColor}
                  fontWeight="600"
                  letterSpacing="widest"
                  whiteSpace="nowrap"
                >
                  INSPECTION PLATFORM
                </Text>
              </Box>
            </HStack>
          </RouterLink>
        ) : (
          <Tooltip label="Industrial Quality Control & Inspection Platform" placement="right" hasArrow>
            <RouterLink to={isPE ? '/production/dashboard' : '/inspector/dashboard'}>
              <Flex
                w={8}
                h={8}
                borderRadius="md"
                bg="orange.500"
                align="center"
                justify="center"
                _hover={{ bg: 'orange.600' }}
              >
                <Icon as={Flame} boxSize={5} color="white" />
              </Flex>
            </RouterLink>
          </Tooltip>
        )}
      </Flex>

      {/* Navigation List */}
      <VStack
        gap={1}
        align="stretch"
        px={2}
        py={4}
        flex={1}
        overflowY="auto"
        overflowX="hidden"
      >
        {navItems.map((item) => {
          const active = isItemActive(item);

          const buttonContent = (
            <Button
              asChild
              variant="ghost"
              size="sm"
              w="full"
              aria-label={item.label}
              justifyContent={isCollapsed ? 'center' : 'flex-start'}
              px={isCollapsed ? 0 : 3}
              py={2.5}
              h="38px"
              color={active ? 'white' : navInactiveColor}
              bg={active ? 'brand.500' : 'transparent'}
              _hover={{
                bg: active ? 'brand.600' : navInactiveHoverBg,
                color: active ? 'white' : navInactiveHoverColor,
                textDecoration: 'none',
              }}
              fontWeight={active ? '700' : '500'}
              fontSize="xs"
              borderRadius="md"
            >
              <RouterLink to={item.path}>
                <Icon
                  as={item.icon}
                  boxSize={4}
                  color={active ? 'white' : navIconColor}
                  mr={isCollapsed ? 0 : 2}
                />
                {!isCollapsed && (
                  <Text textAlign="left" flex={1}>
                    {item.label}
                  </Text>
                )}
              </RouterLink>
            </Button>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.path} label={item.label} placement="right" hasArrow>
                <Box>{buttonContent}</Box>
              </Tooltip>
            );
          }

          return <Box key={item.path}>{buttonContent}</Box>;
        })}
      </VStack>

      {/* Bottom User Info & Logout */}
      <Box
        flexShrink={0}
        mt="auto"
        p={2.5}
        borderTop="1px solid"
        borderColor={sidebarBorder}
        bg={sidebarBottomBg}
      >
        {!isCollapsed && user && (
          <HStack
            gap={2.5}
            p={2}
            mb={2}
            bg={userCardBg}
            borderRadius="md"
            overflow="hidden"
          >
            <Avatar
              size="xs"
              name={user.fullName || user.username}
              bg="brand.500"
              color="white"
            />
            <Box flex={1} overflow="hidden">
              <Text fontSize="xs" fontWeight="700" color={userNameColor}>
                {user.fullName || user.username}
              </Text>
              <Text fontSize="2xs" color={userRoleColor}>
                {isPE ? 'Production Engineer' : 'Quality Inspector'}
              </Text>
            </Box>
          </HStack>
        )}
        <Box>
          {isCollapsed ? (
            <Tooltip label="Logout" placement="right" hasArrow>
              <IconButton
                aria-label="Logout"
                size="sm"
                variant="ghost"
                color={logoutColor}
                _hover={{ bg: logoutHoverBg, color: logoutHoverColor }}
                onClick={logout}
                w="full"
              >
                <LogOut size={16} />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              size="xs"
              variant="ghost"
              color={logoutColor}
              _hover={{ bg: logoutHoverBg, color: logoutHoverColor }}
              onClick={logout}
              justifyContent="flex-start"
              fontWeight="600"
              w="full"
            >
              <Icon as={LogOut} boxSize={3.5} color="red.500" mr={2} />
              Logout
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};
