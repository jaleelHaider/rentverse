import React, { useEffect, useState } from 'react';
import { getAdminUsers } from '@/api/endpoints/admin';

const UserManagement: React.FC = () => {
	const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;

		const load = async () => {
			try {
				const payload = await getAdminUsers();
				if (!active) return;
				setUsers(payload);
			} catch (err) {
				if (!active) return;
				setError(err instanceof Error ? err.message : 'Failed to load users');
			} finally {
				if (active) setIsLoading(false);
			}
		};

		void load();
		return () => {
			active = false;
		};
	}, []);

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-semibold">Users</h1>
				<p className="text-sm text-slate-600">View user identity, contact details, KYC state, and whether a user is also an admin worker.</p>
			</div>

			{error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
			{isLoading ? <div className="text-sm text-slate-600">Loading users...</div> : null}

			<div className="overflow-auto rounded-lg border border-slate-200">
				<table className="w-full text-sm">
					<thead className="bg-slate-50 text-left text-slate-600">
						<tr>
							<th className="p-2">Name</th>
							<th className="p-2">Email</th>
							<th className="p-2">City</th>
							<th className="p-2">KYC</th>
							<th className="p-2">Account</th>
						</tr>
					</thead>
					<tbody>
						{users.map((row) => (
							<tr key={String(row.id)} className="border-t border-slate-100">
								<td className="p-2">{String(row.name || '-')}</td>
								<td className="p-2">{String(row.email || '-')}</td>
								<td className="p-2">{String(row.city || '-')}</td>
								<td className="p-2">{String(row.kycStatus || '-')}</td>
								<td className="p-2">{row.admin ? `Admin (${String((row.admin as Record<string, unknown>).role || '-')})` : 'User'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default UserManagement;

