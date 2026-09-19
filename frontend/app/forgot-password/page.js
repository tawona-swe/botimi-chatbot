'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
});

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await api.forgotPassword(data.email);
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    }
  };

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

        {sent ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-on-surface">Check your email</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              If an account exists for that email, we&apos;ve sent a link to reset your password. It expires in 1 hour.
            </p>
            <Link href="/login" className="inline-block text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-on-surface">Forgot your password?</h1>
            <p className="mt-2 text-sm text-on-surface-variant mb-8">Enter your email and we&apos;ll send you a reset link.</p>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-sm font-semibold text-on-surface-variant mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="you@example.com"
                    className="w-full border border-outline-variant rounded-xl py-3 pr-4 pl-11 text-sm text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-error flex items-center gap-1"><span>•</span> {errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-on-primary py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </button>

              <p className="text-center text-sm text-on-surface-variant">
                Remembered it? <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">Sign in</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
