'use client';

// AuthBar — header widget for sign-in / sign-up, board switching, and logout.
// Talks to: /api/auth/me, /api/auth/login, /api/auth/signup,
// /api/auth/board, /api/auth/logout.  Fires onBoardChange(board) to the
// parent page whenever the active board changes (login, signup, or switch).

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  GraduationCap, Loader2, Lock, LogOut, Mail, User, UserCircle, Sun, Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  board: string;
  className: string;
}

interface AuthBarProps {
  onBoardChange?: (board: string) => void;
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

type Mode = 'login' | 'signup';
type Board = 'ICSE' | 'CBSE';
const BOARDS: Board[] = ['ICSE', 'CBSE'];

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export function AuthBar({ onBoardChange, user, setUser, loading, setLoading }: AuthBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);


  // Dialog + form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [board, setBoard] = useState<Board>('ICSE');
  const [className, setClassName] = useState('10');

  const [switchingBoard, setSwitchingBoard] = useState(false);

  useEffect(() => {
    if (board !== 'ICSE' && !['9', '10'].includes(className)) {
      setClassName('10');
    }
  }, [board, className]);

  // Google Login Callback handler
  const handleGoogleLoginCallback = async (response: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Google Sign-in failed');
        return;
      }
      setUser(data.user);
      onBoardChange?.(data.user.board);
      setDialogOpen(false);
      toast.success(`Welcome ${data.user.name || data.user.email}!`);
    } catch {
      toast.error('Network error during Google Sign-in');
    } finally {
      setSubmitting(false);
    }
  };

  // Mock Google Login Callback helper for local testing
  const handleMockGoogleLogin = async () => {
    const fakePayload = {
      email: 'mockuser@gmail.com',
      name: 'Mock Google User',
      sub: 'mock_google_id_123456'
    };
    const fakeHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
    const fakePayloadEncoded = btoa(JSON.stringify(fakePayload)).replace(/=/g, '');
    const fakeSignature = 'fake_signature';
    const fakeCredential = `${fakeHeader}.${fakePayloadEncoded}.${fakeSignature}`;

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: fakeCredential }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Mock Login failed');
        return;
      }
      setUser(data.user);
      onBoardChange?.(data.user.board);
      setDialogOpen(false);
      toast.success(`Signed in as ${data.user.name || data.user.email} (Mock Google)`);
    } catch {
      toast.error('Network error during mock Google sign-in');
    } finally {
      setSubmitting(false);
    }
  };

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      if (typeof window !== 'undefined' && (window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1035515286469-dummyclientid.apps.googleusercontent.com',
          callback: handleGoogleLoginCallback,
        });
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Render Google Sign-in button when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => {
        try {
          if (typeof window !== 'undefined' && (window as any).google) {
            (window as any).google.accounts.id.initialize({
              client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1035515286469-dummyclientid.apps.googleusercontent.com',
              callback: handleGoogleLoginCallback,
            });
            (window as any).google.accounts.id.renderButton(
              document.getElementById('google-signin-btn'),
              { theme: 'outline', size: 'large', width: 280 }
            );
          }
        } catch (e) {
          console.error('Failed to render Google Sign-in button:', e);
        }
      }, 300);
    }
  }, [dialogOpen, mode]);

  // ── On mount: set mounted for theme selection ─────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Reset form fields when opening the dialog ────────────────────────────
  const openDialog = useCallback((m: Mode) => {
    setMode(m);
    setName('');
    setEmail('');
    setPassword('');
    setBoard('ICSE');
    setClassName('10');
    setDialogOpen(true);
  }, []);

  // ── Submit login or signup ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!email.trim() || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body =
        mode === 'login'
          ? { email: email.trim(), password }
          : {
              email: email.trim(),
              password,
              name: name.trim() || undefined,
              board,
              className,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Something went wrong');
        return;
      }

      setUser(data.user);
      onBoardChange?.(data.user.board);
      setDialogOpen(false);
      toast.success(
        mode === 'login'
          ? `Welcome back${data.user.name ? `, ${data.user.name}` : ''}!`
          : 'Account created — welcome to Project Forge!'
      );
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Switch board (when logged in) ────────────────────────────────────────
  const switchBoard = async (next: Board) => {
    if (!user || next === user.board || switchingBoard) return;
    setSwitchingBoard(true);
    try {
      const res = await fetch('/api/auth/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to update board');
        return;
      }
      setUser(data.user);
      onBoardChange?.(data.user.board);
      toast.success(`Switched to ${next} board`);
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setSwitchingBoard(false);
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore — clear local state anyway
    }
    setUser(null);
    toast.success('Signed out');
    onBoardChange?.('ICSE');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const renderThemeToggle = () => {
    if (!mounted) return <div className="size-9 rounded-full bg-muted/40 animate-pulse" />;
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="size-9 rounded-full text-foreground/70 hover:text-foreground hover:bg-muted/60 transition-all duration-200"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4 text-amber-500" />
        ) : (
          <Moon className="h-4 w-4 text-emerald-600" />
        )}
      </Button>
    );
  };

  // ── Loading skeleton (initial /me fetch) ─────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="size-8 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  // ── Logged out ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <div className="flex items-center gap-2">
          {renderThemeToggle()}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDialog('login')}
            className="text-foreground/80 hover:text-foreground hover:bg-muted/50"
          >
            Sign in
          </Button>
          <Button
            size="sm"
            onClick={() => openDialog('signup')}
            className="bg-brand text-brand-foreground hover:bg-brand/90 hover:scale-[1.02] transition-all shadow-sm gap-1.5"
          >
            <UserCircle className="size-4" />
            <span className="hidden sm:inline">Get started</span>
            <span className="sm:hidden">Sign up</span>
          </Button>
        </div>

        <AuthDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={mode}
          setMode={setMode}
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          board={board}
          setBoard={setBoard}
          className={className}
          setClassName={setClassName}
          submitting={submitting}
          onSubmit={handleSubmit}
          onMockGoogleLogin={handleMockGoogleLogin}
        />
      </>
    );
  }

  // ── Logged in ────────────────────────────────────────────────────────────
  const initial = (user.name?.[0] || user.email?.[0] || '?').toUpperCase();

  return (
    <>
      <div className="flex items-center gap-2">
        {renderThemeToggle()}
        {/* Board toggle — desktop */}
        <div
          role="group"
          aria-label="Board selector"
          className="hidden items-center rounded-full border border-border bg-muted/40 p-0.5 sm:flex"
        >
          {BOARDS.map((b) => {
            const active = user.board === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => switchBoard(b)}
                disabled={switchingBoard}
                aria-pressed={active}
                className={
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ' +
                  (active
                    ? 'bg-brand text-brand-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground')
                }
              >
                {switchingBoard ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <GraduationCap className="size-3" />
                )}
                {b}
              </button>
            );
          })}
        </div>

        {/* Board badge — mobile (compact) */}
        <Badge variant="secondary" className="sm:hidden bg-brand-soft text-brand">
          <GraduationCap className="size-3" />
          {user.board}
        </Badge>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open user menu"
              className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Avatar className="size-8 ring-1 ring-border">
                <AvatarFallback className="bg-brand text-xs font-semibold text-brand-foreground">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground md:inline">
                {user.name || user.email}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium">
                {user.name || 'Student'}
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Inline board switcher */}
            <div className="flex items-center justify-between px-2 py-1.5 text-sm">
              <span className="text-muted-foreground">Board</span>
              <div className="flex items-center gap-1">
                {BOARDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => switchBoard(b)}
                    disabled={switchingBoard}
                    className={
                      'rounded-md px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ' +
                      (user.board === b
                        ? 'bg-brand text-brand-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground')
                    }
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-2 py-1.5 text-sm">
              <span className="text-muted-foreground">Class</span>
              <Badge variant="outline" className="font-mono text-xs">
                Class {user.className}
              </Badge>
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Auth dialog (login + signup)
// ────────────────────────────────────────────────────────────────────────────

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  board: Board;
  setBoard: (v: Board) => void;
  className: string;
  setClassName: (v: string) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onMockGoogleLogin: () => void;
}

function AuthDialog(props: AuthDialogProps) {
  const {
    open, onOpenChange, mode, setMode,
    name, setName, email, setEmail, password, setPassword,
    board, setBoard, className, setClassName,
    submitting, onSubmit, onMockGoogleLogin,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 dark:bg-slate-900/95 backdrop-blur-xl border border-black/5 dark:border-white/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-brand text-brand-foreground">
              <GraduationCap className="size-4" />
            </span>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? 'Sign in to sync your board, projects, and chat history.'
              : 'Join Project Forge — pick your board and class to get personalized projects.'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={
              'rounded-md px-3 py-1.5 font-medium transition-colors ' +
              (mode === 'login'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={
              'rounded-md px-3 py-1.5 font-medium transition-colors ' +
              (mode === 'signup'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            Create account
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          {mode === 'signup' && (
            <div className="grid gap-1.5">
              <Label htmlFor="auth-name" className="text-xs text-muted-foreground">
                Name <span className="opacity-60">(optional)</span>
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="pl-8"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="auth-email" className="text-xs text-muted-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="pl-8"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="auth-password" className="text-xs text-muted-foreground">
              Password{' '}
              {mode === 'signup' && (
                <span className="opacity-60">(min 6 chars)</span>
              )}
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-8"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {mode === 'signup' && (
            <>
              <Separator className="my-1" />

              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Board</Label>
                <RadioGroup
                  value={board}
                  onValueChange={(v) => setBoard(v as Board)}
                  className="grid grid-cols-2 gap-2"
                >
                  {BOARDS.map((b) => (
                    <label
                      key={b}
                      htmlFor={`board-${b}`}
                      className={
                        'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ' +
                        (board === b
                          ? 'border-brand bg-brand-soft text-brand'
                          : 'border-border hover:bg-accent/50')
                      }
                    >
                      <RadioGroupItem id={`board-${b}`} value={b} />
                      <span className="font-medium">{b}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="auth-class" className="text-xs text-muted-foreground">
                  Class
                </Label>
                <Select value={className} onValueChange={setClassName}>
                  <SelectTrigger id="auth-class" className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {board === 'ICSE' ? (
                      Array.from({ length: 10 }, (_, i) => String(i + 1)).map((c) => (
                        <SelectItem key={c} value={c}>Class {c}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="9">Class 9</SelectItem>
                        <SelectItem value="10">Class 10</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Or Continue with Google */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Or continue with</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <div className="flex flex-col gap-2">
            <div id="google-signin-btn" className="w-full flex justify-center min-h-[40px]"></div>
            <Button
              type="button"
              variant="outline"
              onClick={onMockGoogleLogin}
              disabled={submitting}
              className="w-full border-brand/20 bg-brand-soft/5 hover:bg-brand-soft/20 text-brand text-xs font-bold gap-2 h-10 rounded-xl transition-all"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Mock Google Sign-In
            </Button>
          </div>

          <DialogFooter className="mt-2 flex-row items-center justify-between gap-2 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {mode === 'login' ? (
                <>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="font-medium text-brand hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="font-medium text-brand hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
