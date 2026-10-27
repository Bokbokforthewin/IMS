// import React from 'react';
// import { useAuth } from '../../context/AuthContext.jsx';

// /**
//  * Reusable component authorization wrapper.
//  * 
//  * Usage:
//  * <HasPermission name="component:quick_receive_form_widget">
//  *   <QuickReceiveWidget />
//  * </HasPermission>
//  */
// export default function HasPermission({ name, fallback = null, children }) {
//   const { hasPermission } = useAuth();

//   // If user lacks the specified permission, render fallback (or nothing)
//   if (!hasPermission(name)) {
//     return fallback;
//   }

//   return <>{children}</>;
// }