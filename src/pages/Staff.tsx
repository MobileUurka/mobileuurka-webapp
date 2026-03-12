import { useEffect, useState, useMemo } from 'react'
import { userService, type User } from '../services/userServices';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import SearchContainer from '../components/SearchContainer';

const Staff = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

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

  // Define columns locally or move to a constants file
  const STAFF_COLUMNS = [
    {
      label: "Name",
      key: "name",
      width: "30%",
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#e5decb] flex items-center justify-center text-xs text-gray-700 shrink-0">
            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
          </div>
          <span>{user.firstName} {user.lastName}</span>
        </div>
      )
    },
    { label: "Email", key: "email", width: "30%" },
    { label: "Role", key: "role", width: "20%" },
    { label: "Department", key: "department", width: "20%" },
  ];

  return (
    <div className="pt-6 w-full h-full flex flex-col">
      <div className="w-full flex justify-between items-center mb-6">
        <div className="text-[1.3em] font-medium flex items-center gap-3">
          Staff Members <span className='text-[#a7a18e] font-light'>{filteredUsers.length}</span>
        </div>

        <SearchContainer
          placeholder="Search staff..."
          onSearch={setSearchTerm}
          onAdd={() => navigate("/Settings")} // Or your add staff route
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
    </div>
  )
}

export default Staff;