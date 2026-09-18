'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const schema = yup.object({
  password: yup.string().min(8, 'At least 8 characters').required('Password is required'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Confirm your password'),
});

function AcceptInviteForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => {
    try {
      const result = await api.acceptTeamInvite(token, data.password);
      api.setToken(result.token);
      toast.success(`Welcome to ${result.vendor?.companyName || 'the team'}!`);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.message || 'This invite link is invalid or has expired');
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Invalid invite link</h1>
        <p className="text-sm text-gray-500">This link is missing its invite token. Ask whoever invited you to send a new one.</p>
        <Link href="/login" className="inline-block text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Back to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">Set up your account</h1>
      <p className="mt-2 text-sm text-gray-500 mb-8">Choose a password to finish joining your team on botimi.</p>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="At least 8 characters"
              className="w-full border border-gray-200 rounded-xl py-3 pr-12 pl-11 text-sm text-gray-900 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>•</span> {errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="Repeat your password"
              className="w-full border border-gray-200 rounded-xl py-3 pr-4 pl-11 text-sm text-gray-900 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
            />
          </div>
          {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>•</span> {errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-on-primary py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Setting up...' : 'Join the team'}
        </button>
      </form>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary opacity-[0.08] blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary opacity-[0.08] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 relative">
          <span className="text-lg font-bold text-primary">
            botimi<span className="inline-block w-[5px] h-[5px] rounded-full bg-tertiary ml-1 align-super" />
          </span>
        </Link>
        <Suspense fallback={<p className="text-sm text-gray-500">Loading...</p>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </div>
  );
}
