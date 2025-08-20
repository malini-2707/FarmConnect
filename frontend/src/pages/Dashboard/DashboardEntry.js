import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const DashboardEntry = () => {
	const { user, isAuthenticated, loading } = useAuth();

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
			</div>
		);
	}

	if (!isAuthenticated || !user) {
		return <Navigate to="/login" replace />;
	}

	const adminEmail = 'jagatheeshwaril.23it@kongu.edu'.toLowerCase();
	if ((user.email || '').toLowerCase() === adminEmail) {
		return <Navigate to="/dashboard/admin" replace />;
	}

	switch (user.role) {
		case 'admin':
			return <Navigate to="/dashboard/admin" replace />;
		case 'farmer':
			return <Navigate to="/dashboard/farmer" replace />;
		case 'delivery_partner':
			return <Navigate to="/dashboard/delivery" replace />;
		case 'customer':
		default:
			return <Navigate to="/dashboard/customer" replace />;
	}
};

export default DashboardEntry;


