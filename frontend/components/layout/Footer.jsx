'use client';

import Link from 'next/link';
import { Zap, Github, Twitter, Linkedin, Mail, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  const categories = ['Technology', 'AI', 'Sports', 'Politics', 'Science', 'Business'];

  const socialLinks = [
    { icon: Twitter, label: 'Twitter', href: '#' },
    { icon: Github, label: 'GitHub', href: '#' },
    { icon: Linkedin, label: 'LinkedIn', href: '#' },
    { icon: Mail, label: 'Email', href: '#' },
  ];

  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            <div className="lg:col-span-5">
              <Link href="/" className="inline-flex items-center gap-3 mb-5 group">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/15 transition-transform duration-200 group-hover:scale-[1.03]">
                  <Zap size={18} className="fill-white" />
                </div>

                <div className="flex flex-col">
                  <span className="font-display font-black text-2xl leading-none text-[var(--text-primary)]">
                    Groks<span className="text-[var(--accent)]">Blog</span>
                  </span>
                  <span className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Modern sports & world news
                  </span>
                </div>
              </Link>

              <p className="max-w-md text-sm sm:text-[15px] leading-7 text-[var(--text-muted)]">
                Premium news, sharp analysis, and fast-moving updates designed for readers who want
                clarity without clutter. Built to feel modern, fast, and easy to scan.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {socialLinks.map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="group inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:text-[var(--accent)] hover:shadow-md"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
                <div>
                  <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Categories
                  </h4>

                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {categories.map((cat) => (
                      <li key={cat}>
                        <Link
                          href={`/?category=${cat}`}
                          className="group inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                        >
                          <span>{cat}</span>
                          <ArrowUpRight
                            size={14}
                            className="opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Platform
                  </h4>

                  <ul className="space-y-3">
                    <li>
                      <Link
                        href="/"
                        className="group inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                      >
                        <span>Home</span>
                        <ArrowUpRight
                          size={14}
                          className="opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                        />
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/admin/login"
                        className="group inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                      >
                        <span>Admin Login</span>
                        <ArrowUpRight
                          size={14}
                          className="opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                        />
                      </Link>
                    </li>
                  </ul>

                  <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)] mb-2">
                      Built for speed
                    </p>
                    <p className="text-sm leading-6 text-[var(--text-muted)]">
                      A cleaner reading experience with strong hierarchy, faster scanning, and less visual noise.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-[var(--border)] pt-5 sm:pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--text-muted)]">
                © {new Date().getFullYear()} GroksBlog. Built with Next.js + MongoDB.
              </p>

              <p className="text-xs text-[var(--text-muted)]">
                Forged for the curious mind ⚡
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}