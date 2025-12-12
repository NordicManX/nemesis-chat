// app/components/logout-button.tsx
'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut()} 
      className="
        group flex items-center gap-2 px-4 py-2 rounded-lg 
        bg-red-500/10 hover:bg-red-600 
        border border-red-500/20 hover:border-red-500
        text-red-400 hover:text-white 
        transition-all duration-300 ease-in-out
        font-semibold text-sm
        shadow-sm hover:shadow-lg hover:shadow-red-900/40
      "
      title="Encerrar Sessão"
    >
      {/* Ícone SVG que move para esquerda quando passa o mouse */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="18" height="18" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="transition-transform group-hover:-translate-x-1"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      <span>Sair</span>
    </button>
  );
}