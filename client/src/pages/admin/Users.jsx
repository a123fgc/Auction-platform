import { useEffect, useState } from 'react';
import { listUsersApi, suspendUserApi } from '../../api/admin.api';
import UsersTable from '../../components/admin/UsersTable';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import Toast from '../../components/common/Toast';
import useDebounce from '../../hooks/useDebounce';

const LIMIT = 20;

export default function Users() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 400);
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    listUsersApi({
      page,
      limit: LIMIT,
      search: debounced || undefined,
      role: role || undefined,
    })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, role]);

  useEffect(() => {
    setPage(1);
  }, [debounced, role]);

  const onToggleSuspend = async (u) => {
    try {
      await suspendUserApi(u.id, !u.is_suspended);
      setToast(`${u.full_name} ${u.is_suspended ? 'unsuspended' : 'suspended'}`);
      load();
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <Toast message={toast} tone="success" />
      <h1 className="mb-4 text-2xl font-bold">Users</h1>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <UsersTable users={data.data} onToggleSuspend={onToggleSuspend} />
      )}

      <Pagination
        page={page}
        total={data.total}
        limit={LIMIT}
        onPageChange={setPage}
      />
    </div>
  );
}