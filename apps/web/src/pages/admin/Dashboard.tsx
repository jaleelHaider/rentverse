import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '@/api/endpoints/admin';

const Dashboard: React.FC = () => {
	const [data, setData] = useState<{
		stats: {
			users: number;
			listings: number;
			orders: number;
			pendingKyc: number;
			openDisputes: number;
		};
		recentKyc: Array<Record<string, unknown>>;
		recentAudit: Array<Record<string, unknown>>;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;

		const load = async () => {
			try {
				const payload = await getAdminDashboard();
				if (!active) return;
				setData(payload);
			} catch (err) {
				if (!active) return;
				setError(err instanceof Error ? err.message : 'Failed to load dashboard');
			} finally {
				if (active) setIsLoading(false);
			}
		};

		void load();
		return () => {
			active = false;
		};
	}, []);

	if (isLoading) {
		return <div className="text-sm text-slate-600">Loading dashboard...</div>;
	}

	if (error) {
		return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
	}

	const stats = data?.stats || { users: 0, listings: 0, orders: 0, pendingKyc: 0, openDisputes: 0 };

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-6 text-white shadow-sm">
				<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin Dashboard</h1>
				<p className="mt-1 text-sm text-slate-200">Operations overview for users, listings, orders, and KYC verification.</p>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs uppercase tracking-wide text-slate-500">Users</p>
					<p className="mt-2 text-3xl font-semibold text-slate-900">{stats.users}</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs uppercase tracking-wide text-slate-500">Listings</p>
					<p className="mt-2 text-3xl font-semibold text-slate-900">{stats.listings}</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs uppercase tracking-wide text-slate-500">Orders</p>
					<p className="mt-2 text-3xl font-semibold text-slate-900">{stats.orders}</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs uppercase tracking-wide text-slate-500">Pending KYC</p>
					<p className="mt-2 text-3xl font-semibold text-slate-900">{stats.pendingKyc}</p>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs uppercase tracking-wide text-slate-500">Open Disputes</p>
					<p className="mt-2 text-3xl font-semibold text-slate-900">{stats.openDisputes}</p>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-200 bg-slate-50 p-3">
						<h2 className="font-medium">Latest KYC Queue</h2>
					</div>
					<div className="max-h-96 overflow-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 text-left text-slate-600">
								<tr>
									<th className="p-3">User</th>
									<th className="p-3">Status</th>
									<th className="p-3">AI Verdict</th>
								</tr>
							</thead>
							<tbody>
								{(data?.recentKyc || []).map((row, index) => (
									<tr key={String(row.userId || index)} className="border-t border-slate-100 hover:bg-slate-50/70">
										<td className="p-3">{String(row.userId || '-').slice(0, 8)}...</td>
										<td className="p-3">{String(row.status || '-')}</td>
										<td className="p-3">{String(row.analysisVerdict || '-')} ({Math.round(Number(row.analysisScore || 0) * 100)}%)</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-200 bg-slate-50 p-3">
						<h2 className="font-medium">Recent Audit</h2>
					</div>
					<div className="max-h-96 overflow-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 text-left text-slate-600">
								<tr>
									<th className="p-3">When</th>
									<th className="p-3">Role</th>
									<th className="p-3">Action</th>
								</tr>
							</thead>
							<tbody>
								{(data?.recentAudit || []).map((row, index) => (
									<tr key={String(row.id || index)} className="border-t border-slate-100 hover:bg-slate-50/70">
										<td className="p-3">{String(row.created_at || '-').replace('T', ' ').slice(0, 16)}</td>
										<td className="p-3">{String(row.actor_role || '-')}</td>
										<td className="p-3">{String(row.action || '-')}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			</div>

			<div className="rounded-xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Marketplace analytics</p>
						<h2 className="mt-1 text-lg font-semibold text-slate-900">Search behavior insights</h2>
						<p className="mt-1 text-sm text-slate-600">
							Review top queries, zero-result terms, click-through by rank, and recent search activity.
						</p>
					</div>
					<Link
						to="/admin/search-analytics"
						className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
					>
						Open Search Analytics
					</Link>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;

