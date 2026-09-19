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

function ResetPasswordForm() {
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
      await api.resetPassword(token, data.password);
      toast.success('Password reset — please sign in');
      router.push('/login');
    } catch (err) {
      toast.error(err.message || 'This reset link is invalid or has expired');
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-on-surface">Invalid link</h1>
        <p className="text-sm text-on-surface-variant">This password reset link is missing its token. Request a new one below.</p>
        <Link href="/forgot-password" className="inline-block text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-on-surface">Set a new password</h1>
      <p className="mt-2 text-sm text-on-surface-variant mb-8">Choose a new password for your account.</p>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-semibold text-on-surface-variant mb-1.5">New password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="At least 8 characters"
              className="w-full border border-outline-variant rounded-xl py-3 pr-12 pl-11 text-sm text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors" tabIndex={-1}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-error flex items-center gap-1"><span>•</span> {errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-on-surface-variant mb-1.5">Confirm password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="Repeat your password"
              className="w-full border border-outline-variant rounded-xl py-3 pr-4 pl-11 text-sm text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          {errors.confirmPassword && <p className="mt-1.5 text-xs text-error flex items-center gap-1"><span>•</span> {errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-on-primary py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary opacity-[0.08] blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary opacity-[0.08] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <span className="relative inline-block text-lg font-bold text-primary" style={{ fontFamily: '"Outfit", sans-serif' }}>
            botimi
            <span className="absolute rounded-full bg-tertiary" style={{ width: "5px", height: "5px", top: "-2px", right: "-7px" }} />
          </span>
        </Link>
        <Suspense fallback={<p className="text-sm text-on-surface-variant">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
