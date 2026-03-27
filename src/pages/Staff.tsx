import { useEffect, useState, useMemo } from 'react'
import { userService, type User } from '../services/userServices';
import { authService } from '../services/authServices';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import SearchContainer from '../components/SearchContainer';
import AddStaffModal, { type StaffFormData } from '../components/AddStaffModal';
import { useToast } from '../contexts/ToastContext';

const Staff = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Get current user and organization info
  useEffect(() => {
    const user = authService.getUser();
    console.log('Current user in Staff page:', user); // Debug log
    setCurrentUser(user);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Note: userService.getUsers returns the array directly based on your service code
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      // Get organization ID from current user
      const organizationId = currentUser?.organizationId || currentUser?.id;

      if (!organizationId) {
        throw new Error('Organization ID not found');
      }

      const response = await userService.addUserToOrganization(organizationId, staffData);

      if (response.success) {
        // Show success message
        showSuccess(`Staff member added successfully! Verification email sent to ${staffData.email}`);

        // Refresh the users list
        await fetchUsers();

        // Close modal
        setShowAddModal(false);
      } else {
        throw new Error(response.message || 'Failed to add staff member');
      }
    } catch (error: any) {
      console.error('Error adding staff:', error);
      showError(error.message || 'Failed to add staff member. Please try again.');
      throw error; // Re-throw to keep modal open
    }
  };

  // Define columns locally or move to a constants file
  const STAFF_COLUMNS = [
    {
      label: "Name",
      key: "name",
      width: "180px",
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#e5decb] flex items-center justify-center text-xs text-gray-700 shrink-0">
            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
          </div>
          <span className="font-medium truncate">{user.firstName} {user.lastName}</span>
        </div>
      )
    },
    {
      label: "Email",
      key: "email",
      width: "200px",
      render: (user: User) => (
        <span className="text-gray-600 truncate">{user.email}</span>
      )
    },
    {
      label: "Role",
      key: "role",
      width: "120px",
      render: (user: User) => (
        <span className="text-gray-600 capitalize">
          {user.role}
        </span>
      )
    },
    {
      label: "Department",
      key: "department",
      width: "150px",
      render: (user: User) => (
        <span className="text-gray-600 truncate">{user.department || '—'}</span>
      )
    },
    {
      label: "Phone",
      key: "Phone",
      width: "130px",
      render: (user: any) => (
        <span className="text-gray-600">{user.phone || '—'}</span>
      )
    }
  ];

  // Check if user can add staff - temporarily make it more permissive for testing
  const role = currentUser?.role?.toLowerCase();

  const canAddStaff =
    role === "doctor" ||
    role === "admin";


  console.log(filteredUsers)
  return (
    <div className="pt-4 px-4 sm:pt-6 sm:px-6 w-full h-full flex flex-col">
      <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="text-lg sm:text-[1.3em] font-medium flex items-center gap-3">
          Staff Members <span className='text-[#a7a18e] font-light'>{filteredUsers.length}</span>
        </div>

        <SearchContainer
          placeholder="Search staff..."
          onSearch={setSearchTerm}
          showAdd={canAddStaff}
          onAdd={canAddStaff ? () => setShowAddModal(true) : undefined}
          addButtonText="Add Staff"
          onRefresh={fetchUsers}
          showRefresh={true}
          refreshing={loading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      <DataTable<User>
        columns={STAFF_COLUMNS}
        data={filteredUsers}
        onRowClick={(user) => navigate(`/Staff/${user.id}`)}
        emptyMessage={searchTerm ? `No staff found matching "${searchTerm}"` : "No staff members found."}
        initialItemsPerPage={10}
      />

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddStaff}
        organizationId={currentUser?.organizationId || currentUser?.id}
      />
    </div>
  )
}

export default Staff;