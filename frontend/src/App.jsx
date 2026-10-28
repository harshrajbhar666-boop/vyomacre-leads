import React from 'react';
import LeadForm from './components/LeadForm.jsx';
import AdminApp from './components/AdminApp.jsx';

/*
  Two pages, no router library needed:
    /         → public Partner / Invest form
    /admin    → admin login + lead inbox
*/
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin' || path.startsWith('/admin')) return <AdminApp />;
  return <LeadForm />;
}
