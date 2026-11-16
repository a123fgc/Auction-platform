import { formatDate } from '../../utils/format';

export default function UsersTable({ users, onToggleSuspend }) {
  if (!users.length) {
    return <p className="py-6 text-center text-slate-500">No users found.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">Joined</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-2 font-medium">{u.full_name}</td>
              <td className="px-4 py-2 text-slate-600">{u.email}</td>
              <td className="px-4 py-2 capitalize">{u.role}</td>
              <td className="px-4 py-2 text-slate-500">
                {formatDate(u.created_at)}
              </td>
              <td className="px-4 py-2">
                {u.is_suspended ? (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    Suspended
                  </span>
                ) : (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    Active
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                {u.role !== 'admin' && (
                  <button
                    onClick={() => onToggleSuspend(u)}
                    className={`rounded px-2 py-1 text-xs ${
                      u.is_suspended
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}