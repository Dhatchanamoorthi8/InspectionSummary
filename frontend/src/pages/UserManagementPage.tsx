import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  HStack,
  VStack,
  Badge,
  Input,
  Icon,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  Button,
  useToast,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Switch,
  Checkbox,
  Tabs,
  TabList,
  Tab,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
  DataTable,
  Column,
  Select,
  ConfirmationDialog,
} from '../components/ui';
import {
  Plus,
  RefreshCw,
  Edit2,
  PenTool,
  CheckCircle,
  XCircle,
  Shield,
  Trash2,
  Search,
  Lock,
  Sliders,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import { SignaturePad } from '../components/SignaturePad';
import { FormField } from '../components/FormField';
import { usersApi } from '../services/api';
import { User, UserRole, SystemPermission } from '../types';
import { ROLE_DEFAULT_PERMISSIONS, UserRole as RbacUserRole } from '../types/rbac';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('QUALITY_INSPECTOR');
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [createCustomPerms, setCreateCustomPerms] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Edit User Modal
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCanManageUsers, setEditCanManageUsers] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Permissions Assignment Modal
  const [permTarget, setPermTarget] = useState<User | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Quick Create Permission (within modal or catalog)
  const [quickPermId, setQuickPermId] = useState('');
  const [quickPermName, setQuickPermName] = useState('');
  const [quickPermCategory, setQuickPermCategory] = useState('Modules');
  const [quickPermDesc, setQuickPermDesc] = useState('');
  const [isCreatingQuickPerm, setIsCreatingQuickPerm] = useState(false);

  // Global Permissions Catalog Modal
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Signature Modal
  const [sigTarget, setSigTarget] = useState<User | null>(null);
  const [isSavingSig, setIsSavingSig] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Semantic color tokens
  const usernameColor = useColorModeValue('gray.600', 'gray.400');
  const configuredColor = useColorModeValue('green.700', 'green.300');
  const cardBg = useColorModeValue('white', 'gray.800');
  const itemBorder = useColorModeValue('gray.200', 'gray.700');
  const subtleBg = useColorModeValue('gray.50', 'gray.900');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const inheritedBg = useColorModeValue('blue.50', 'rgba(37, 99, 235, 0.15)');
  const inheritedBorder = useColorModeValue('blue.200', 'blue.800');

  useEffect(() => {
    if (!currentUser?.canManageUsers) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to manage users.',
        status: 'error',
        duration: 3000,
      });
      navigate('/production/dashboard');
      return;
    }
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, permsData] = await Promise.all([
        usersApi.getUsers(),
        usersApi.getPermissions().catch(() => []),
      ]);
      setUsers(usersData);
      setPermissions(permsData);
    } catch (err: any) {
      toast({
        title: 'Failed to load user and permission data',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim() || !password.trim()) return;

    setIsCreating(true);
    try {
      await usersApi.createUser({
        username: username.trim(),
        fullName: fullName.trim(),
        password: password.trim(),
        role,
        canManageUsers,
        isActive,
      });

      // If custom permissions were selected, update them immediately
      if (createCustomPerms.length > 0) {
        const refreshed = await usersApi.getUsers();
        const createdUser = refreshed.find((u) => u.username === username.trim());
        if (createdUser) {
          await usersApi.updateUserPermissions(createdUser.id, createCustomPerms);
        }
      }

      toast({
        title: 'User created',
        description: `User @${username} was created successfully.`,
        status: 'success',
        duration: 3000,
      });
      setIsCreateOpen(false);
      setUsername('');
      setFullName('');
      setPassword('');
      setRole('QUALITY_INSPECTOR');
      setCanManageUsers(false);
      setIsActive(true);
      setCreateCustomPerms([]);
      loadData();
    } catch (err: any) {
      toast({
        title: 'User creation failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setIsUpdating(true);
    try {
      const updates: any = {
        fullName: editFullName.trim(),
        canManageUsers: editCanManageUsers,
        isActive: editIsActive,
      };
      if (editPassword.trim()) {
        updates.password = editPassword.trim();
      }

      await usersApi.updateUser(editTarget.id, updates);
      toast({
        title: 'User updated',
        description: `User @${editTarget.username} was updated successfully.`,
        status: 'success',
        duration: 3000,
      });
      setEditTarget(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'User update failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSignature = async (sigData: string) => {
    if (!sigTarget) return;
    setIsSavingSig(true);
    try {
      await usersApi.updateSignature(sigTarget.id, sigData);
      toast({
        title: 'Signature saved',
        description: `Signature for ${sigTarget.fullName} was updated.`,
        status: 'success',
        duration: 3000,
      });
      setSigTarget(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Signature update failed',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsSavingSig(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await usersApi.deleteUser(deleteTarget.id);
      toast({
        title: 'User deleted',
        description: `User ${deleteTarget.fullName} was deleted successfully.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Error deleting user',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditTarget(u);
    setEditFullName(u.fullName);
    setEditPassword('');
    setEditCanManageUsers(u.canManageUsers);
    setEditIsActive(u.isActive);
  };

  // Open Permissions Modal for user
  const openPermissionsModal = (u: User) => {
    setPermTarget(u);
    setSelectedPerms(u.customPermissions ? [...u.customPermissions] : []);
    setPermSearch('');
    setSelectedCategoryTab('ALL');
  };

  // Toggle specific custom permission
  const handleTogglePerm = (permId: string) => {
    setSelectedPerms((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    );
  };

  // Select all / Deselect all in category
  const handleToggleCategory = (category: string, shouldSelect: boolean) => {
    const categoryPermIds = permissions
      .filter((p) => category === 'ALL' || p.category === category)
      .map((p) => p.id);

    setSelectedPerms((prev) => {
      if (shouldSelect) {
        return Array.from(new Set([...prev, ...categoryPermIds]));
      } else {
        return prev.filter((p) => !categoryPermIds.includes(p));
      }
    });
  };

  // Save Permissions for selected user
  const handleSaveUserPermissions = async () => {
    if (!permTarget) return;
    setIsSavingPerms(true);
    try {
      await usersApi.updateUserPermissions(permTarget.id, selectedPerms);
      toast({
        title: 'Permissions updated',
        description: `Updated permissions for @${permTarget.username}.`,
        status: 'success',
        duration: 3000,
      });
      setPermTarget(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Failed to update permissions',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsSavingPerms(false);
    }
  };

  // Create new permission via API
  const handleCreatePermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPermId.trim() || !quickPermName.trim()) return;

    setIsCreatingQuickPerm(true);
    try {
      const created = await usersApi.createPermission({
        id: quickPermId.trim().toUpperCase(),
        name: quickPermName.trim(),
        category: quickPermCategory.trim() || 'Custom',
        description: quickPermDesc.trim() || undefined,
      });

      toast({
        title: 'Permission created',
        description: `Permission [${created.id}] "${created.name}" created.`,
        status: 'success',
        duration: 3000,
      });

      // Refresh permissions catalog
      const refreshedPerms = await usersApi.getPermissions();
      setPermissions(refreshedPerms);

      // If user permission modal is currently open, automatically select the newly created permission
      if (permTarget) {
        setSelectedPerms((prev) => Array.from(new Set([...prev, created.id])));
      }

      setQuickPermId('');
      setQuickPermName('');
      setQuickPermDesc('');
    } catch (err: any) {
      toast({
        title: 'Failed to create permission',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsCreatingQuickPerm(false);
    }
  };

  // Compute categories
  const categories = Array.from(
    new Set(permissions.map((p) => p.category || 'Custom')),
  ).sort();

  // Compute role-inherited permissions for permTarget
  const getRoleInheritedPerms = (u: User | null): string[] => {
    if (!u) return [];
    const defaults = ROLE_DEFAULT_PERMISSIONS[u.role as RbacUserRole] || [];
    const set = new Set<string>(defaults);
    if (u.role === 'PRODUCTION_ENGINEER' && u.canManageUsers) {
      set.add('USER_CREATE');
      set.add('USER_UPDATE');
      set.add('USER_DELETE');
    }
    return Array.from(set);
  };

  const inheritedPerms = getRoleInheritedPerms(permTarget);

  // Filter permissions based on search and category tab
  const filteredPermissions = permissions.filter((p) => {
    const matchesSearch =
      !permSearch ||
      p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(permSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(permSearch.toLowerCase()));

    const matchesCategory =
      selectedCategoryTab === 'ALL' || p.category === selectedCategoryTab;

    return matchesSearch && matchesCategory;
  });

  const columns: Column<User>[] = [
    {
      header: 'Full Name',
      accessor: 'fullName',
      render: (row) => <Text fontWeight="700">{row.fullName}</Text>,
    },
    {
      header: 'Username',
      accessor: 'username',
      render: (row) => (
        <Text fontFamily="mono" color={usernameColor}>
          @{row.username}
        </Text>
      ),
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <Badge colorScheme={row.role === 'PRODUCTION_ENGINEER' ? 'blue' : 'purple'}>
          {row.role === 'PRODUCTION_ENGINEER' ? 'Production Engineer' : 'Quality Inspector'}
        </Badge>
      ),
    },
    {
      header: 'Permissions',
      render: (row) => {
        const customCount = row.customPermissions?.length || 0;
        const totalCount = row.effectivePermissions?.length || 0;
        return (
          <HStack gap={1.5} align="center">
            <Badge colorScheme="blue" variant="subtle" fontSize="2xs">
              {totalCount} total
            </Badge>
            {customCount > 0 && (
              <Badge colorScheme="purple" variant="solid" fontSize="2xs">
                +{customCount} custom
              </Badge>
            )}
          </HStack>
        );
      },
    },
    {
      header: 'User Admin',
      accessor: 'canManageUsers',
      render: (row) => (
        <Badge colorScheme={row.canManageUsers ? 'green' : 'gray'}>
          {row.canManageUsers ? 'GRANTED' : 'NO'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <Badge colorScheme={row.isActive ? 'green' : 'red'}>
          {row.isActive ? 'ACTIVE' : 'INACTIVE'}
        </Badge>
      ),
    },
    {
      header: 'Signature',
      render: (row) =>
        row.signatureData ? (
          <HStack gap={1}>
            <Icon as={CheckCircle} color="green.500" boxSize={4} />
            <Text fontSize="xs" color={configuredColor} fontWeight="600">
              Configured
            </Text>
          </HStack>
        ) : (
          <HStack gap={1}>
            <Icon as={XCircle} color="gray.400" boxSize={4} />
            <Text fontSize="xs" color="gray.400">
              None
            </Text>
          </HStack>
        ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <HStack gap={2} justify="flex-end" flexShrink={0}>
          <Button
            size="xs"
            variant="outline"
            colorScheme="purple"
            leftIcon={<Shield size={12} />}
            onClick={() => openPermissionsModal(row)}
          >
            Permissions
          </Button>
          <Button
            size="xs"
            variant="outline"
            leftIcon={<PenTool size={12} />}
            onClick={() => setSigTarget(row)}
          >
            Signature
          </Button>
          <Button
            size="xs"
            variant="outline"
            leftIcon={<Edit2 size={12} />}
            onClick={() => openEditModal(row)}
          >
            Edit
          </Button>
          <Button
            size="xs"
            variant="outline"
            colorScheme="red"
            leftIcon={<Trash2 size={12} />}
            isDisabled={row.id === currentUser?.id}
            onClick={() => setDeleteTarget(row)}
          >
            Delete
          </Button>
        </HStack>
      ),
    },
  ];

  return (
    <Layout>
      {/* Header */}
      <SectionHeader
        title="User Management and Permissions"
        description="Manage users, grant granular permissions, and define custom inspection capabilities"
        actions={
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw size={15} />}
              onClick={loadData}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="purple"
              leftIcon={<Sliders size={15} />}
              onClick={() => setIsCatalogOpen(true)}
            >
              Permissions Catalog ({permissions.length})
            </Button>
            <Button
              size="sm"
              colorScheme="brand"
              leftIcon={<Plus size={16} />}
              onClick={() => setIsCreateOpen(true)}
            >
              Create New User
            </Button>
          </HStack>
        }
      />

      {/* Users Data Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No users found."
        pageSize={10}
      />

      {/* =========================================================================
          PERMISSIONS ASSIGNMENT MODAL (ASSIGN PERMISSIONS TO A SPECIFIC USER)
          ========================================================================= */}
      <Modal
        isOpen={!!permTarget}
        onClose={() => setPermTarget(null)}
        size="xl"
        scrollBehavior="inside"
        isCentered
        blockScrollOnMount={false}
        preserveScrollBarGap={true}
        motionPreset="slide-in-bottom"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent mx={4} maxH="85vh">
          <ModalHeader pb={2}>
            <HStack gap={3} align="center">
              <Box p={2} bg="purple.500" color="white" borderRadius="md">
                <Shield size={18} />
              </Box>
              <Box>
                <Heading size="sm">
                  Permissions Assignment: {permTarget?.fullName}
                </Heading>
                <HStack gap={2} mt={1}>
                  <Text fontSize="xs" color={mutedText} fontFamily="mono">
                    @{permTarget?.username}
                  </Text>
                  <Badge colorScheme={permTarget?.role === 'PRODUCTION_ENGINEER' ? 'blue' : 'purple'}>
                    {permTarget?.role === 'PRODUCTION_ENGINEER' ? 'Production Engineer' : 'Quality Inspector'}
                  </Badge>
                  <Badge colorScheme="green" variant="subtle">
                    {inheritedPerms.length + selectedPerms.filter((p) => !inheritedPerms.includes(p)).length} Active
                  </Badge>
                </HStack>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton disabled={isSavingPerms} />

          <ModalBody py={4} overflow="visible">
            <VStack gap={5} align="stretch">
              {/* Inherited Role Permissions Info Box */}
              <Box
                p={3.5}
                bg={inheritedBg}
                borderWidth="1px"
                borderColor={inheritedBorder}
                borderRadius="lg"
              >
                <HStack gap={2} mb={2}>
                  <Icon as={Lock} color="blue.600" boxSize={4} />
                  <Text fontSize="xs" fontWeight="700" color="blue.700">
                    ROLE-INHERITED PERMISSIONS ({inheritedPerms.length})
                  </Text>
                </HStack>
                <Text fontSize="2xs" color={mutedText} mb={2}>
                  These permissions are automatically active based on the user's role ({permTarget?.role}).
                </Text>
                <Flex wrap="wrap" gap={1.5}>
                  {inheritedPerms.map((permId) => (
                    <Badge
                      key={permId}
                      colorScheme="blue"
                      variant="subtle"
                      fontSize="2xs"
                      fontFamily="mono"
                    >
                      {permId}
                    </Badge>
                  ))}
                </Flex>
              </Box>

              {/* Custom Permission Search & Category Filter */}
              <Box>
                <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={2}>
                  <Text fontSize="xs" fontWeight="700" textTransform="uppercase">
                    Assign Custom & Granular Permissions
                  </Text>
                  <HStack gap={2}>
                    <Button
                      size="2xs"
                      variant="outline"
                      colorScheme="purple"
                      onClick={() => handleToggleCategory(selectedCategoryTab, true)}
                    >
                      Select All in Tab
                    </Button>
                    <Button
                      size="2xs"
                      variant="ghost"
                      onClick={() => handleToggleCategory(selectedCategoryTab, false)}
                    >
                      Clear Tab
                    </Button>
                  </HStack>
                </Flex>

                <Box position="relative" w="100%" mb={3}>
                  <Box position="absolute" left="10px" top="50%" transform="translateY(-50%)" zIndex={2} pointerEvents="none">
                    <Search size={14} color="#A0AEC0" />
                  </Box>
                  <Input
                    size="sm"
                    pl="32px"
                    placeholder="Search permissions by name, code or description..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                  />
                </Box>

                {/* Category Pills */}
                <Flex wrap="wrap" gap={1.5} mb={3}>
                  <Button
                    size="xs"
                    variant={selectedCategoryTab === 'ALL' ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => setSelectedCategoryTab('ALL')}
                  >
                    All ({permissions.length})
                  </Button>
                  {categories.map((cat) => {
                    const count = permissions.filter((p) => p.category === cat).length;
                    return (
                      <Button
                        key={cat}
                        size="xs"
                        variant={selectedCategoryTab === cat ? 'solid' : 'outline'}
                        colorScheme="purple"
                        onClick={() => setSelectedCategoryTab(cat)}
                      >
                        {cat} ({count})
                      </Button>
                    );
                  })}
                </Flex>

                {/* Permissions Checkbox Grid */}
                <VStack gap={2.5} align="stretch" maxH="280px" overflowY="auto" pr={1}>
                  {filteredPermissions.length === 0 ? (
                    <Box py={6} textAlign="center">
                      <Text fontSize="xs" color={mutedText}>
                        No permissions match "{permSearch}".
                      </Text>
                    </Box>
                  ) : (
                    filteredPermissions.map((perm) => {
                      const isInherited = inheritedPerms.includes(perm.id);
                      const isSelected = selectedPerms.includes(perm.id);

                      return (
                        <Box
                          key={perm.id}
                          p={2.5}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor={isSelected || isInherited ? 'purple.300' : itemBorder}
                          bg={isSelected ? subtleBg : cardBg}
                          _hover={{ borderColor: 'purple.400' }}
                          transition="border-color 140ms ease-out, background-color 140ms ease-out, transform 100ms cubic-bezier(0.23, 1, 0.32, 1)"
                          _active={{ transform: 'scale(0.99)' }}
                        >
                          <Flex align="start" justify="space-between" gap={3}>
                            <Checkbox
                              isChecked={isSelected || isInherited}
                              isDisabled={isInherited}
                              onChange={() => handleTogglePerm(perm.id)}
                              colorScheme="purple"
                              mt={0.5}
                            >
                              <Box>
                                <HStack gap={2} align="center">
                                  <Text fontSize="xs" fontWeight="700">
                                    {perm.name}
                                  </Text>
                                  <Badge
                                    fontSize="3xs"
                                    fontFamily="mono"
                                    colorScheme={perm.isSystem ? 'gray' : 'teal'}
                                  >
                                    {perm.id}
                                  </Badge>
                                  {isInherited && (
                                    <Badge fontSize="3xs" colorScheme="blue">
                                      Role Default
                                    </Badge>
                                  )}
                                </HStack>
                                {perm.description && (
                                  <Text fontSize="2xs" color={mutedText} mt={0.5}>
                                    {perm.description}
                                  </Text>
                                )}
                              </Box>
                            </Checkbox>

                            <Badge fontSize="3xs" colorScheme="purple" variant="outline">
                              {perm.category}
                            </Badge>
                          </Flex>
                        </Box>
                      );
                    })
                  )}
                </VStack>
              </Box>

              {/* Inline Quick Add Permission */}
              <Accordion allowToggle>
                <AccordionItem borderWidth="1px" borderColor={itemBorder} borderRadius="md">
                  <AccordionButton py={2} _expanded={{ bg: subtleBg }}>
                    <Box flex="1" textAlign="left">
                      <HStack gap={2}>
                        <Icon as={Sparkles} color="purple.500" boxSize={4} />
                        <Text fontSize="xs" fontWeight="700">
                          + Define & Assign New Permission Code
                        </Text>
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Box as="form" onSubmit={handleCreatePermissionSubmit}>
                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} mb={3}>
                        <FormControl isRequired>
                          <FormLabel fontSize="2xs" fontWeight="700">
                            PERMISSION CODE (KEY)
                          </FormLabel>
                          <Input
                            size="xs"
                            placeholder="e.g. INSPECT_ULTRASONIC"
                            value={quickPermId}
                            onChange={(e) => setQuickPermId(e.target.value.toUpperCase())}
                          />
                        </FormControl>

                        <FormControl isRequired>
                          <FormLabel fontSize="2xs" fontWeight="700">
                            DISPLAY NAME
                          </FormLabel>
                          <Input
                            size="xs"
                            placeholder="e.g. Ultrasonic NDT Inspection"
                            value={quickPermName}
                            onChange={(e) => setQuickPermName(e.target.value)}
                          />
                        </FormControl>
                      </SimpleGrid>

                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} mb={3}>
                        <FormControl>
                          <FormLabel fontSize="2xs" fontWeight="700">
                            CATEGORY
                          </FormLabel>
                          <Input
                            size="xs"
                            placeholder="e.g. Modules, Reports, Custom"
                            value={quickPermCategory}
                            onChange={(e) => setQuickPermCategory(e.target.value)}
                          />
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="2xs" fontWeight="700">
                            DESCRIPTION (OPTIONAL)
                          </FormLabel>
                          <Input
                            size="xs"
                            placeholder="e.g. Allows performing ultrasonic inspection"
                            value={quickPermDesc}
                            onChange={(e) => setQuickPermDesc(e.target.value)}
                          />
                        </FormControl>
                      </SimpleGrid>

                      <Button
                        type="submit"
                        size="xs"
                        colorScheme="purple"
                        leftIcon={<Plus size={12} />}
                        isLoading={isCreatingQuickPerm}
                        isDisabled={!quickPermId.trim() || !quickPermName.trim()}
                      >
                        Create & Auto-Select
                      </Button>
                    </Box>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </VStack>
          </ModalBody>

          <ModalFooter gap={2} borderTopWidth="1px" borderColor={itemBorder}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPermTarget(null)}
              isDisabled={isSavingPerms}
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              size="sm"
              isLoading={isSavingPerms}
              onClick={handleSaveUserPermissions}
              leftIcon={<KeyRound size={15} />}
            >
              Save Permissions ({selectedPerms.length} assigned)
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* =========================================================================
          PERMISSIONS CATALOG MODAL (GLOBAL REGISTRY)
          ========================================================================= */}
      <Modal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        size="xl"
        scrollBehavior="inside"
        isCentered
        blockScrollOnMount={false}
        preserveScrollBarGap={true}
        motionPreset="slide-in-bottom"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent mx={4} maxH="85vh">
          <ModalHeader>
            <HStack gap={2.5}>
              <Box p={2} bg="purple.500" color="white" borderRadius="md">
                <Sliders size={18} />
              </Box>
              <Box>
                <Heading size="sm">System Permissions Catalog</Heading>
                <Text fontSize="xs" color={mutedText} mt={0.5}>
                  Global directory of permissions and extensible industrial modules
                </Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody py={4} overflow="visible">
            <VStack gap={4} align="stretch">
              {/* Form to Add New Permission */}
              <Box
                p={4}
                bg={subtleBg}
                borderWidth="1px"
                borderColor={itemBorder}
                borderRadius="lg"
                as="form"
                onSubmit={handleCreatePermissionSubmit}
              >
                <HStack gap={2} mb={3}>
                  <Icon as={Sparkles} color="purple.500" boxSize={4} />
                  <Text fontSize="xs" fontWeight="700">
                    CREATE NEW PERMISSION
                  </Text>
                </HStack>

                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} mb={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="2xs" fontWeight="700">
                      PERMISSION CODE
                    </FormLabel>
                    <Input
                      size="sm"
                      placeholder="e.g. INSPECT_WELDING"
                      value={quickPermId}
                      onChange={(e) => setQuickPermId(e.target.value.toUpperCase())}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="2xs" fontWeight="700">
                      DISPLAY NAME
                    </FormLabel>
                    <Input
                      size="sm"
                      placeholder="e.g. Welding Quality Inspection"
                      value={quickPermName}
                      onChange={(e) => setQuickPermName(e.target.value)}
                    />
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} mb={3}>
                  <FormControl>
                    <FormLabel fontSize="2xs" fontWeight="700">
                      CATEGORY
                    </FormLabel>
                    <Input
                      size="sm"
                      placeholder="e.g. Modules, Requests, Custom"
                      value={quickPermCategory}
                      onChange={(e) => setQuickPermCategory(e.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="2xs" fontWeight="700">
                      DESCRIPTION
                    </FormLabel>
                    <Input
                      size="sm"
                      placeholder="e.g. Authorizes entering welding QC reports"
                      value={quickPermDesc}
                      onChange={(e) => setQuickPermDesc(e.target.value)}
                    />
                  </FormControl>
                </SimpleGrid>

                <Button
                  type="submit"
                  size="sm"
                  colorScheme="purple"
                  leftIcon={<Plus size={14} />}
                  isLoading={isCreatingQuickPerm}
                  isDisabled={!quickPermId.trim() || !quickPermName.trim()}
                >
                  Register Permission
                </Button>
              </Box>

              {/* Catalog Search & List */}
              <Box position="relative" w="100%">
                <Box position="absolute" left="10px" top="50%" transform="translateY(-50%)" zIndex={2} pointerEvents="none">
                  <Search size={14} color="#A0AEC0" />
                </Box>
                <Input
                  size="sm"
                  pl="32px"
                  placeholder="Filter catalog permissions..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </Box>

              <VStack gap={2} align="stretch" maxH="320px" overflowY="auto">
                {permissions
                  .filter(
                    (p) =>
                      !catalogSearch ||
                      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                      p.id.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                      (p.description && p.description.toLowerCase().includes(catalogSearch.toLowerCase())),
                  )
                  .map((p) => (
                    <Box
                      key={p.id}
                      p={3}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={itemBorder}
                      bg={cardBg}
                    >
                      <Flex justify="space-between" align="start" gap={2}>
                        <Box>
                          <HStack gap={2}>
                            <Text fontSize="xs" fontWeight="700">
                              {p.name}
                            </Text>
                            <Badge
                              fontSize="3xs"
                              fontFamily="mono"
                              colorScheme={p.isSystem ? 'gray' : 'teal'}
                            >
                              {p.id}
                            </Badge>
                            <Badge fontSize="3xs" colorScheme="purple" variant="outline">
                              {p.category}
                            </Badge>
                          </HStack>
                          {p.description && (
                            <Text fontSize="2xs" color={mutedText} mt={1}>
                              {p.description}
                            </Text>
                          )}
                        </Box>
                        <Badge
                          fontSize="3xs"
                          colorScheme={p.isSystem ? 'blue' : 'green'}
                        >
                          {p.isSystem ? 'System' : 'Custom'}
                        </Badge>
                      </Flex>
                    </Box>
                  ))}
              </VStack>
            </VStack>
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderColor={itemBorder}>
            <Button size="sm" onClick={() => setIsCatalogOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* =========================================================================
          CREATE USER MODAL
          ========================================================================= */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        isCentered
        size="md"
        blockScrollOnMount={false}
        preserveScrollBarGap={true}
        motionPreset="slide-in-bottom"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent as="form" onSubmit={handleCreateSubmit}>
          <ModalHeader fontSize="md" fontWeight="800">
            Create User Account
          </ModalHeader>
          <ModalCloseButton disabled={isCreating} />
          <ModalBody py={4} overflow="visible">
            <VStack gap={4} align="stretch">
              <FormField
                id="create-full-name"
                label="FULL NAME"
                isRequired
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />

              <FormField
                id="create-username"
                label="USERNAME"
                isRequired
                placeholder="e.g. jdoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <FormField
                id="create-password"
                label="PASSWORD"
                type="password"
                isRequired
                placeholder="Enter initial password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Select
                id="userRole"
                label="ROLE"
                isRequired
                value={role}
                onChange={(val) => setRole(val as UserRole)}
                options={[
                  { value: 'PRODUCTION_ENGINEER', label: 'Production Engineer' },
                  { value: 'QUALITY_INSPECTOR', label: 'Quality Inspector' },
                ]}
              />

              {role === 'PRODUCTION_ENGINEER' && (
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel fontSize="xs" fontWeight="700" m={0}>
                    GRANT USER MANAGEMENT PERMISSION
                  </FormLabel>
                  <Switch
                    isChecked={canManageUsers}
                    onChange={(e: any) => setCanManageUsers(e.target.checked)}
                    colorScheme="brand"
                  />
                </FormControl>
              )}

              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel fontSize="xs" fontWeight="700" m={0}>
                  ACTIVE STATUS
                </FormLabel>
                <Switch
                  isChecked={isActive}
                  onChange={(e: any) => setIsActive(e.target.checked)}
                  colorScheme="green"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              isDisabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="brand"
              size="sm"
              isLoading={isCreating}
              isDisabled={!username.trim() || !fullName.trim() || !password.trim()}
            >
              Create User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* =========================================================================
          EDIT USER MODAL
          ========================================================================= */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        isCentered
        blockScrollOnMount={false}
        preserveScrollBarGap={true}
        motionPreset="slide-in-bottom"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent as="form" onSubmit={handleEditSubmit} mx={4}>
          <ModalHeader fontSize="md" fontWeight="800">
            Edit User: {editTarget?.fullName} (@{editTarget?.username})
          </ModalHeader>
          <ModalCloseButton disabled={isUpdating} />
          <ModalBody py={4} overflow="visible">
            <VStack gap={4} align="stretch">
              <FormField
                id="edit-full-name"
                label="FULL NAME"
                isRequired
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />

              <FormField
                id="edit-password"
                label="NEW PASSWORD (LEAVE BLANK TO KEEP CURRENT)"
                type="password"
                placeholder="Enter new password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />

              {editTarget?.role === 'PRODUCTION_ENGINEER' && (
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel fontSize="xs" fontWeight="700" m={0}>
                    CAN MANAGE USERS
                  </FormLabel>
                  <Switch
                    isChecked={editCanManageUsers}
                    onChange={(e: any) => setEditCanManageUsers(e.target.checked)}
                    colorScheme="brand"
                  />
                </FormControl>
              )}

              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel fontSize="xs" fontWeight="700" m={0}>
                  ACTIVE ACCOUNT STATUS
                </FormLabel>
                <Switch
                  isChecked={editIsActive}
                  onChange={(e: any) => setEditIsActive(e.target.checked)}
                  colorScheme="green"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditTarget(null)}
              isDisabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="brand"
              size="sm"
              isLoading={isUpdating}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Signature Modal */}
      <Modal
        isOpen={!!sigTarget}
        onClose={() => setSigTarget(null)}
        size="lg"
        isCentered
        blockScrollOnMount={false}
        preserveScrollBarGap={true}
        motionPreset="slide-in-bottom"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent>
          <ModalHeader fontSize="md" fontWeight="800">
            Digital Signature for {sigTarget?.fullName}
          </ModalHeader>
          <ModalCloseButton disabled={isSavingSig} />
          <ModalBody pb={6}>
            <SignaturePad
              initialSignature={sigTarget?.signatureData}
              onSave={handleSaveSignature}
              isLoading={isSavingSig}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete User Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User Account"
        description={`Are you sure you want to permanently delete user account "${deleteTarget?.fullName} (@${deleteTarget?.username})"? Any assigned pending tasks will be unassigned.`}
        confirmLabel="Delete User"
        isDestructive
        isLoading={isDeleting}
      />
    </Layout>
  );
};
