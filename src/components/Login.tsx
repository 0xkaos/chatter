'use client';

import { useState, useEffect } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simple client-side check for demo purposes, or validate against env var via API
    // Since we can't easily expose env vars to client without API, we'll do a simple API check
    
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      
      if (res.ok) {
        onLogin(username);
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div className="flex h-[100dvh] items-center justify-center overflow-y-auto bg-gray-100 p-4 dark:bg-gray-900 sm:p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800 sm:p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Chatter Login</h2>
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-base dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-base dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
