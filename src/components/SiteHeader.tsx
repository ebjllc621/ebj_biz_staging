/**
 * SiteHeader Component - Public Site Header with Authentication
 *
 * @authority mandatory-verification-protocol.mdc - httpOnly cookies
 * @pattern Next.js 14 App Router, CSS Custom Properties (tokens.css)
 * @governance Integrates AuthButtons for authentication UI
 * @compliance master_build_v_4_4_0.md §15.1 (path aliases)
 *
 * FEATURES:
 * - Site logo/branding
 * - Navigation links
 * - AuthButtons integration (Sign In/Sign Up or UserMenu)
 * - Responsive mobile menu
 * - Sticky header
 * - Skip link for accessibility
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import AuthButtons from '@/features/auth/components/AuthButtons';

interface NavLink {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

const navLinks: NavLink[] = [
  { href: '/listings', label: 'Listings' },
  { href: '/events', label: 'Events' },
  { href: '/offers', label: 'Offers' },
  { href: '/bundles', label: 'Bundles' },
  { href: '/content', label: 'Content' },
  { href: '/jobs', label: 'Jobs' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null);
  const [mobilePagesOpen, setMobilePagesOpen] = useState(false);

  /**
   * Check if link is active (parent active when child is active)
   */
  const isActiveLink = (href: string): boolean => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  /**
   * Toggle mobile dropdown
   */
  const toggleMobileDropdown = (href: string) => {
    setMobileDropdownOpen(prev => prev === href ? null : href);
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header" role="banner">
        <div className="container header-inner" role="navigation" aria-label="Primary">
          {/* Logo/Brand */}
          <Link href="/" className="brand" aria-label="Bizconekt home">
            <Image
              src="/uploads/site/branding/namelogo-horizontal.png"
              alt="Bizconekt"
              width={200}
              height={40}
              priority
              style={{ height: 'auto', maxHeight: '40px', width: 'auto' }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            <ul className="nav">
              {navLinks.map((link) => (
                <li key={link.href} className={link.children ? 'nav-item-with-dropdown' : ''}>
                  <Link
                    href={link.href as any}
                    className={isActiveLink(link.href) ? 'active' : ''}
                    aria-current={isActiveLink(link.href) ? 'page' : undefined}
                    aria-haspopup={link.children ? 'true' : undefined}
                  >
                    {link.label}
                    {link.children && (
                      <svg
                        className="nav-chevron"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Link>

                  {/* Dropdown Menu (CSS hover reveal) */}
                  {link.children && (
                    <div className="nav-dropdown">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href as any}
                          className={isActiveLink(child.href) ? 'active' : ''}
                          aria-current={isActiveLink(child.href) ? 'page' : undefined}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Auth Buttons (Desktop) */}
          <div className="auth-buttons-container desktop-only">
            <AuthButtons />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu - Single row: Auth (left) + Pages dropdown (right) */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <div className="mobile-menu-row">
              {/* Auth Buttons - left aligned */}
              <div className="mobile-auth-buttons">
                <AuthButtons />
              </div>

              {/* Pages Dropdown - right aligned */}
              <div className="mobile-pages-dropdown">
                <button
                  type="button"
                  onClick={() => setMobilePagesOpen(!mobilePagesOpen)}
                  className="mobile-pages-toggle"
                  aria-expanded={mobilePagesOpen}
                  aria-haspopup="true"
                >
                  Pages
                  <svg
                    className={`mobile-pages-chevron ${mobilePagesOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Pages dropdown content */}
                {mobilePagesOpen && (
                  <nav className="mobile-pages-content" aria-label="Page navigation">
                    {navLinks.map((link) => (
                      <div key={link.href}>
                        {link.children ? (
                          <>
                            {/* Parent with sub-items */}
                            <button
                              type="button"
                              onClick={() => toggleMobileDropdown(link.href)}
                              className={isActiveLink(link.href) ? 'active' : ''}
                              aria-expanded={mobileDropdownOpen === link.href}
                            >
                              {link.label}
                              <svg
                                className={`mobile-pages-chevron ${mobileDropdownOpen === link.href ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* Sub-items */}
                            {mobileDropdownOpen === link.href && (
                              <div className="mobile-pages-subitems">
                                <Link
                                  href={link.href as any}
                                  onClick={() => { setMobilePagesOpen(false); setMobileMenuOpen(false); }}
                                  className={pathname === link.href ? 'active' : ''}
                                >
                                  All {link.label}
                                </Link>
                                {link.children.map((child) => (
                                  <Link
                                    key={child.href}
                                    href={child.href as any}
                                    onClick={() => { setMobilePagesOpen(false); setMobileMenuOpen(false); }}
                                    className={isActiveLink(child.href) ? 'active' : ''}
                                  >
                                    {child.label}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <Link
                            href={link.href as any}
                            onClick={() => { setMobilePagesOpen(false); setMobileMenuOpen(false); }}
                            className={isActiveLink(link.href) ? 'active' : ''}
                            aria-current={isActiveLink(link.href) ? 'page' : undefined}
                          >
                            {link.label}
                          </Link>
                        )}
                      </div>
                    ))}
                  </nav>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}