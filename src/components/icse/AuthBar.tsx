'use client';

// AuthBar — header widget for sign-in / sign-up, board switching, and logout.
// Talks to: /api/auth/me, /api/auth/login, /api/auth/signup,
// /api/auth/board, /api/auth/logout.  Fires onBoardChange(board) to the
// parent page whenever the active board changes (login, signup, or switch).

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  GraduationCap, Loader2, Lock, LogOut, Mail, User, UserCircle,
} from 'lucide-react';

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
}

type Mode = 'login' | 'signup';
type Board = 'ICSE' | 'CBSE';
const BOARDS: Board[] = ['ICSE', 'CBSE'];

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export function AuthBar({ onBoardChange }: AuthBarProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  // ── On mount: fetch current user ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.user) {
          setUser(data.user);
          onBoardChange?.(data.user.board);
        }
      } catch {
        // network / parsing errors → stay signed out
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDialog('login')}
            className="text-foreground/80 hover:text-foreground"
          >
            Sign in
          </Button>
          <Button
            size="sm"
            onClick={() => openDialog('signup')}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
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
        />
      </>
    );
  }

  // ── Logged in ────────────────────────────────────────────────────────────
  const initial = (user.name?.[0] || user.email?.[0] || '?').toUpperCase();

  return (
    <>
      <div className="flex items-center gap-2">
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
}

function AuthDialog(props: AuthDialogProps) {
  const {
    open, onOpenChange, mode, setMode,
    name, setName, email, setEmail, password, setPassword,
    board, setBoard, className, setClassName,
    submitting, onSubmit,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                    <SelectItem value="9">Class 9</SelectItem>
                    <SelectItem value="10">Class 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

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
