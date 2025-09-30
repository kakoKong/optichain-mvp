'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-white antialiased">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image src="/OptichainLogo.png" alt="OptiChain" width={40} height={40} className="mr-3" />
              <span className="text-xl font-bold tracking-tight text-gray-900">OptiChain</span>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-6">
                <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">{t('nav.features')}</a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">{t('nav.pricing')}</a>
                <a href="#about" className="text-gray-600 hover:text-gray-900 text-sm font-medium">{t('nav.about')}</a>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href="/app/signin" className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm">
                {t('nav.getStarted')}
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-gray-900 focus:outline-none" aria-label="Toggle menu">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-3 space-y-1">
              <a href="#features" className="block text-gray-700 px-3 py-2 rounded-md text-base">{t('nav.features')}</a>
              <a href="#pricing" className="block text-gray-700 px-3 py-2 rounded-md text-base">{t('nav.pricing')}</a>
              <a href="#about" className="block text-gray-700 px-3 py-2 rounded-md text-base">{t('nav.about')}</a>
              <div className="px-3 py-2">
                <LanguageSwitcher />
              </div>
              <Link href="/app/signin" className="block bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-base">
                {t('nav.getStarted')}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white shadow-sm border rounded-full px-3 py-1 mb-5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="text-xs font-medium text-gray-700">{t('hero.badge')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
                {t('hero.title')}
            </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mb-8">
                {t('hero.subtitle')}
            </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/beta" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow">
                  {t('hero.startFree')}
              </Link>
              <Link href="/demo" className="border border-gray-300 hover:border-gray-400 text-gray-800 px-8 py-3 rounded-lg text-lg font-semibold transition-colors bg-white">
                  {t('hero.watchDemo')}
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-gray-700">
              {[
                  [t('hero.kpi1'), t('hero.kpi1Label')],
                  [t('hero.kpi2'), t('hero.kpi2Label')],
                  [t('hero.kpi3'), t('hero.kpi3Label')],
                  [t('hero.kpi4'), t('hero.kpi4Label')]
              ].map(([kpi, label]) => (
                  <div key={label} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{kpi}</div>
                  <div className="text-gray-600">{label}</div>
                </div>
              ))}
              </div>
            </div>
            
            {/* Hero Image */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-200 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="text-sm text-gray-500 ml-4">OptiChain Dashboard</div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 bg-blue-100 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">1,247</div>
                        <div className="text-xs text-gray-600">Products</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">98.5%</div>
                        <div className="text-xs text-gray-600">Accuracy</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600">24/7</div>
                        <div className="text-xs text-gray-600">Monitoring</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">+127</div>
                    <div className="text-xs text-gray-500">Today</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">✓</div>
                    <div className="text-xs text-gray-500">Synced</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('features.title')}</h2>
            <p className="text-lg text-gray-600 mt-3">{t('features.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              title={t('features.scanner.title')}
              desc={t('features.scanner.desc')}
              iconBg="bg-blue-100"
              iconPath="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              gradient="from-blue-500 to-blue-600"
            />
            <FeatureCard
              title={t('features.inventory.title')}
              desc={t('features.inventory.desc')}
              iconBg="bg-emerald-100"
              iconPath="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              gradient="from-emerald-500 to-emerald-600"
            />
            <FeatureCard
              title={t('features.analytics.title')}
              desc={t('features.analytics.desc')}
              iconBg="bg-purple-100"
              iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              gradient="from-purple-500 to-purple-600"
            />
            <FeatureCard
              title={t('features.transactions.title')}
              desc={t('features.transactions.desc')}
              iconBg="bg-orange-100"
              iconPath="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              gradient="from-orange-500 to-orange-600"
            />
          </div>
        </div>
      </section>

      {/* Mobile Experience Showcase */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('mobile.title')}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('mobile.subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Phone Mockup */}
            <div className="lg:col-span-1 flex justify-center">
              <div className="relative">
                <div className="w-64 h-[500px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                  <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                    <div className="h-8 bg-gray-100 rounded-t-[2rem] flex items-center justify-center">
                      <div className="w-16 h-1 bg-gray-300 rounded-full"></div>
                    </div>
                    <div className="p-4 h-full bg-gradient-to-b from-blue-50 to-white">
                      <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900">Scanner</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">Product Found</div>
                              <div className="text-xs text-gray-500">ABC123456789</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">Stock: 45</div>
                              <div className="text-xs text-gray-500">Last updated 2m ago</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-blue-600 rounded-lg p-3 text-white">
                          <div className="text-sm font-medium">Quick Actions</div>
                          <div className="flex gap-2 mt-2">
                            <button className="flex-1 bg-blue-700 rounded px-2 py-1 text-xs">+1</button>
                            <button className="flex-1 bg-blue-700 rounded px-2 py-1 text-xs">-1</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating notification */}
                <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
                  ✓
                </div>
              </div>
            </div>
            
            {/* Features List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{t('mobile.lightning.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('mobile.lightning.desc')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{t('mobile.offline.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('mobile.offline.desc')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{t('mobile.device.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('mobile.device.desc')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{t('mobile.sync.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('mobile.sync.desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('pricing.title')}</h2>
            <p className="text-lg text-gray-600 mt-3">{t('pricing.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PriceCard
              title={t('pricing.starter.title')}
              price={t('pricing.starter.price')}
              period={t('pricing.starter.period')}
              blurb={t('pricing.starter.blurb')}
              features={[
                t('pricing.starter.feature1'),
                t('pricing.starter.feature2'),
                t('pricing.starter.feature3'),
                t('pricing.starter.feature4'),
                t('pricing.starter.feature5'),
              ]}
              cta={t('pricing.starter.cta')}
              href="/beta"
              accent="neutral"
              available={true}
            />

            <PriceCard
              badge={t('pricing.comingSoon')}
              title={t('pricing.pro.title')}
              price={t('pricing.pro.price')}
              period={t('pricing.pro.period')}
              blurb={t('pricing.pro.blurb')}
              features={[
                t('pricing.pro.feature1'),
                t('pricing.pro.feature2'),
                t('pricing.pro.feature3'),
                t('pricing.pro.feature4'),
                t('pricing.pro.feature5'),
              ]}
              cta={t('pricing.comingSoon')}
              href="#"
              accent="primary"
              available={false}
            />

            <PriceCard
              title={t('pricing.enterprise.title')}
              price={t('pricing.enterprise.price')}
              period={t('pricing.enterprise.period')}
              blurb={t('pricing.enterprise.blurb')}
              features={[
                t('pricing.enterprise.feature1'),
                t('pricing.enterprise.feature2'),
                t('pricing.enterprise.feature3'),
                t('pricing.enterprise.feature4'),
              ]}
              cta={t('pricing.comingSoon')}
              href="#"
              accent="dark"
              available={false}
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('about.title')}</h2>
              <p className="text-gray-700 mb-6">
                {t('about.subtitle')}
              </p>
              <ul className="space-y-3">
                {[
                  [t('about.feature1.title'), t('about.feature1.desc')],
                  [t('about.feature2.title'), t('about.feature2.desc')],
                  [t('about.feature3.title'), t('about.feature3.desc')],
                ].map(([t, d]) => (
                  <li key={t} className="flex items-start">
                    <span className="mt-1 mr-3 h-5 w-5 rounded-full bg-blue-600 text-white grid place-items-center text-xs">✓</span>
                    <div>
                      <div className="font-semibold text-gray-900">{t}</div>
                      <div className="text-gray-600">{d}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl border">
              <div className="text-center">
                <Image src="/OptichainLogo2.png" alt="OptiChain Logo" width={120} height={120} className="mx-auto mb-6" />
                <h4 className="text-xl font-bold text-gray-900 mb-2">{t('about.cta.title')}</h4>
                <p className="text-gray-600 mb-6">{t('about.cta.subtitle')}</p>
                <Link href="/beta" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block">
                  {t('about.cta.button')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image src="/OptichainLogo.png" alt="OptiChain" width={28} height={28} className="mr-2" />
                <span className="text-lg font-semibold text-white">OptiChain</span>
              </div>
              <p className="text-gray-400 text-sm">{t('footer.tagline')}</p>
            </div>
            <FooterCol title={t('footer.product')} links={[
              [t('nav.features'), '#features'],
              [t('nav.pricing'), '#pricing'],
              [t('nav.about'), '#about'],
            ]}/>
            <FooterCol title={t('footer.company')} links={[
              [t('footer.about'), '/about'],
              [t('footer.privacy'), '/privacy'],
              [t('footer.terms'), '/terms'],
            ]}/>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} OptiChain. {t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** Components **/

function FeatureCard({
  title,
  desc,
  iconBg,
  iconPath,
  gradient
}: {
  title: string
  desc: string
  iconBg: string
  iconPath: string
  gradient: string
}) {
  return (
    <div className="group bg-white rounded-2xl border shadow-sm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className={`w-16 h-16 ${iconBg} rounded-2xl flex items-center justify-center mb-6 relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
        <svg className="w-8 h-8 text-gray-700 group-hover:text-white transition-colors duration-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
  )
}

function PriceCard({
  badge,
  title,
  price,
  period,
  blurb,
  features,
  cta,
  href,
  accent,
  available = true
}: {
  badge?: string
  title: string
  price: string
  period?: string
  blurb: string
  features: string[]
  cta: string
  href: string
  accent: 'primary' | 'dark' | 'neutral'
  available?: boolean
}) {
  const accentClasses = {
    primary: 'border-2 border-blue-500 shadow-lg relative',
    dark: 'border shadow-sm',
    neutral: 'border shadow-sm'
  }[accent]

  return (
    <div className={`bg-white p-8 rounded-2xl ${accentClasses} ${!available ? 'opacity-60 relative' : ''}`}>
      {!available && (
        <div className="absolute inset-0 bg-gray-50/50 rounded-2xl z-10"></div>
      )}
      {badge ? (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <span className={`${available ? 'bg-blue-600' : 'bg-gray-500'} text-white px-3 py-1 rounded-full text-xs font-semibold`}>{badge}</span>
        </div>
      ) : null}
      <div className="text-center relative z-0">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
        <div className="mb-2">
          <span className="text-4xl font-extrabold text-gray-900">{price}</span>
          {period && <span className="text-gray-600">{period}</span>}
        </div>
        <p className="text-gray-600 mb-6">{blurb}</p>
      </div>
      <ul className="space-y-3 mb-8 relative z-0">
        {features.map((f) => (
          <li key={f} className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-gray-700">{f}</span>
          </li>
        ))}
      </ul>
      {available ? (
      <Link
        href={href}
          className={`w-full block text-center py-3 rounded-lg font-semibold transition-colors relative z-0 ${
          accent === 'primary'
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : accent === 'dark'
            ? 'bg-gray-900 hover:bg-gray-800 text-white'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
        }`}
      >
        {cta}
      </Link>
      ) : (
        <button
          disabled
          className="w-full block text-center py-3 rounded-lg font-semibold bg-gray-400 text-white cursor-not-allowed relative z-0"
        >
          {cta}
        </button>
      )}
    </div>
  )
}

function FooterCol({ title, links }: { title: string, links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-semibold text-white mb-4">{title}</h4>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith('/') ? (
              <Link href={href} className="text-gray-400 hover:text-white transition-colors text-sm">{label}</Link>
            ) : (
              <a href={href} className="text-gray-400 hover:text-white transition-colors text-sm">{label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
