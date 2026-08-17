import { useEffect, useState, useMemo } from 'react';
import { userService, type User } from '../services/userServices';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchStaff, invalidateStaff } from '../store/staffSlice';
import DataTable from '../components/DataTable';
import SearchContainer from '../components/SearchContainer';
import AddStaffModal, { type StaffFormData } from '../components/AddStaffModal';
import EditStaffModal, { type EditStaffFormData } from '../components/EditStaffModal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { FiTrash2 } from 'react-icons/fi';

const STAFF_COLUMNS = [
  {
    label: 'Name',
    key: 'name',
    width: '280px',
    render: (user: User) => (
      <div className="flex items-center gap-3 cursor-pointer">
        <div className="w-8 h-8 rounded-full bg-[#e5decb] flex items-center justify-center text-xs text-gray-700 shrink-0">
          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
        </div>
        <span className="font-medium truncate">{user.firstName} {user.lastName}</span>
      </div>
    )
  },
  {
    label: 'Email',
    key: 'email',
    width: '250px',
    render: (user: User) => <span className="text-gray-600 truncate cursor-pointer">{user.email}</span>
  },
  {
    label: 'Role',
    key: 'role',
    width: '120px',
    render: (user: User) => <span className="text-gray-600 capitalize cursor-pointer">{user.role}</span>
  },
  {
    label: 'Hospital',
    key: 'hospital',
    width: '220px',
    render: (user: User) => <span className="text-gray-600 truncate cursor-pointer">{(user as any).hospital || '—'}</span>
  },
  {
    label: 'Phone',
    key: 'phone',
    width: '130px',
    render: (user: any) => <span className="text-gray-600 cursor-pointer">{user.phone || '—'}</span>
  },
];

const Staff = () => {
  const { showSuccess, showError } = useToast();
  const dispatch = useAppDispatch();
  const users = useAppSelector(s => s.staff.data);
  const status = useAppSelector(s => s.staff.status);
  const { user: currentUser } = useAuth();

  console.log(users);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);

  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter((u) =>
      u.firstName?.toLowerCase().includes(term) ||
      u.lastName?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const handleAddStaff = async (staffData: StaffFormData) => {
    try {
      const organizationId = currentUser?.organizationId || currentUser?.id;
      if (!organizationId) throw new Error('Organization ID not found');

      const response = await userService.addUserToOrganization(organizationId, staffData);

      if (response.success) {
        showSuccess(`Staff member ${staffData.firstName} ${staffData.lastName} added. They'll be prompted to change their password on first login.`);
        // Invalidate so the next background fetch picks up the new user
        // (socket will also push the update in real-time via SocketProvider)
        dispatch(invalidateStaff());
        dispatch(fetchStaff());
        setShowAddModal(false);
      } else {
        throw new Error(response.message || 'Failed to add staff member');
      }
    } catch (error: any) {
      showError(error.message || 'Failed to add staff member. Please try again.');
      throw error;
    }
  };

  const canManageStaff = ['admin'].includes(
    currentUser?.role?.toLowerCase() ?? ''
  ) || currentUser?.organizationId != null;

  const handleRemoveStaff = async (user: User) => {
    if (!window.confirm(`Deactivate ${user.firstName} ${user.lastName}? They will no longer be able to sign in.`)) {
      return;
    }
    try {
      await userService.deleteUser(user.id);
      showSuccess(`${user.firstName} ${user.lastName} has been deactivated.`);
      dispatch(invalidateStaff());
      dispatch(fetchStaff());
    } catch (error: any) {
      showError(error?.message ?? 'Failed to remove staff member');
    }
  };

  const handleEditStaff = (user: User) => {
    if (user.id === currentUser?.id) {
      showError('You cannot edit your own profile');
      return;
    }
    setEditingStaff(user);
    setShowEditModal(true);
  };

  const handleUpdateStaff = async (updateData: EditStaffFormData) => {
    if (!editingStaff) return;

    try {
      const response = await userService.updateUser(editingStaff.id, updateData);

      if (response.success || response.status === 200) {
        showSuccess(`${editingStaff.firstName} ${editingStaff.lastName} has been updated.`);
        dispatch(invalidateStaff());
        dispatch(fetchStaff());
        setShowEditModal(false);
        setEditingStaff(null);
      } else {
        throw new Error(response.message || 'Failed to update staff member');
      }
    } catch (error: any) {
      showError(error.message || 'Failed to update staff member. Please try again.');
      throw error;
    }
  };

  const staffColumns = canManageStaff
    ? [
      ...STAFF_COLUMNS,
      {
        label: '',
        key: 'actions',
        width: '60px',
        render: (user: User) =>
          user.id === currentUser?.id ? null : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemoveStaff(user); }}
              className="text-gray-400 hover:text-red-500 p-1"
              title="Deactivate staff"
            >
              <FiTrash2 size={15} />
            </button>
          ),
      },
    ]
    : STAFF_COLUMNS;

  return (
    <div className="pt-4 px-4 sm:pt-6 sm:px-6 w-full h-full flex flex-col">
      <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="text-lg sm:text-[1.3em] font-medium flex items-center gap-3">
          Staff Members <span className='text-[#a7a18e] font-light'>{filteredUsers.length}</span>
        </div>

        <SearchContainer
          placeholder="Search staff..."
          onSearch={setSearchTerm}
          showAdd={canManageStaff}
          onAdd={canManageStaff ? () => setShowAddModal(true) : undefined}
          addButtonText="Add Staff"
          onRefresh={() => { dispatch(invalidateStaff()); dispatch(fetchStaff()); }}
          showRefresh={true}
          refreshing={status === 'loading'}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      <DataTable<User>
        columns={staffColumns}
        data={filteredUsers}
        emptyMessage={searchTerm ? `No staff found matching "${searchTerm}"` : 'No staff members found.'}
        initialItemsPerPage={10}
        onRowClick={(user) => canManageStaff && handleEditStaff(user)}
      />

      <AddStaffModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddStaff}
        organizationId={currentUser?.organizationId || currentUser?.id}
      />

      <EditStaffModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingStaff(null);
        }}
        onSubmit={handleUpdateStaff}
        staff={editingStaff}
      />
    </div>
  );
};

export default Staff;
