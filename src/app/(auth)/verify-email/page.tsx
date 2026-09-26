'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verify = async () => {
      setStatus('verifying');
      try {
        const res = await fetch('/api/auth/verification/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok) {
          setStatus('success');
          setMessage(data.data?.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.error?.message || 'Verification link is invalid or expired.');
        }
      } catch {
        if (isMounted) {
          setStatus('error');
          setMessage('Network error verifying your email. Please try again.');
        }
      }
    };

    verify();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailParam ? { email: emailParam } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to resend verification email');
      }
      setMessage('A fresh verification link has been sent to your email.');
      setResendCooldown(60);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Error resending email');
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 border-[#2A303A]">
      {status === 'verifying' && (
        <div className="py-8 text-center space-y-4">
          <div className="animate-spin text-3xl">⏳</div>
          <p className="text-slate-200 font-medium">Verifying your email address...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-6 text-center">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            <p className="font-bold text-base mb-1">Email Verified! 🎉</p>
            <p>{message}</p>
          </div>
          <Button
            onClick={() => {
              router.push('/dashboard');
              router.refresh();
            }}
            className="w-full"
          >
            Continue to Dashboard
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-6 text-center">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <p className="font-bold mb-1">Verification Failed</p>
            <p>{message}</p>
          </div>
          <Button
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="w-full"
            variant="outline"
          >
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : resending
              ? 'Sending...'
              : 'Resend Verification Email'}
          </Button>
          <Link
            href="/login"
            className="inline-block text-xs text-slate-400 hover:text-slate-300"
          >
            Back to Sign In
          </Link>
        </div>
      )}

      {status === 'idle' && (
        <div className="space-y-6 text-center">
          <p className="text-sm text-slate-300">
            Please check your inbox for the verification email sent during registration. Click the link in that email to confirm your account.
          </p>
          {message && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              {message}
            </div>
          )}
          <Button
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="w-full"
            variant="outline"
          >
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : resending
              ? 'Sending...'
              : 'Resend Verification Email'}
          </Button>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Skip to Dashboard for now →
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0E1014]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-2xl mb-2">
            ✉️
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Email Verification
          </h1>
          <p className="text-sm text-slate-400">
            Verify your email to secure and activate your account
          </p>
        </div>

        <Suspense fallback={<div className="text-slate-400 text-center">Loading...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
