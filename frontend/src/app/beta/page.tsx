'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ArrowLeftIcon, ClockIcon, UsersIcon, StarIcon, ExternalLinkIcon, CheckCircleIcon, SparklesIcon } from 'lucide-react'

export default function BetaPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image src="/OptichainLogo.png" alt="OptiChain" width={40} height={40} className="mr-3" />
              <span className="text-xl font-bold tracking-tight text-gray-900">OptiChain</span>
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
              </Link>
            </div>

            {/* Mobile menu */}
            <div className="md:hidden flex items-center space-x-2">
              <LanguageSwitcher />
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full px-6 py-2 mb-8 shadow-lg">
              <SparklesIcon className="h-5 w-5" />
              <span className="text-sm font-semibold">{t('payment.beta.badge')}</span>
            </div>
            
            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6">
              {t('payment.beta.title')}
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              {t('payment.beta.subtitle')}
            </p>

            {/* CTA Button */}
            <a
              href="https://forms.gle/B5qz5A9oWbwZ9RZn7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-5 rounded-2xl text-lg font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform"
            >
              <ExternalLinkIcon className="h-6 w-6 mr-3" />
              {t('payment.beta.cta.button')}
            </a>
            
            <p className="mt-6 text-sm text-gray-500">
              {t('payment.beta.cta.note')}
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 border border-blue-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <ClockIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('payment.beta.feature1.title')}</h3>
                <p className="text-gray-600 leading-relaxed">{t('payment.beta.feature1.desc')}</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 border border-green-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <UsersIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('payment.beta.feature2.title')}</h3>
                <p className="text-gray-600 leading-relaxed">{t('payment.beta.feature2.desc')}</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 border border-purple-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <StarIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('payment.beta.feature3.title')}</h3>
                <p className="text-gray-600 leading-relaxed">{t('payment.beta.feature3.desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-16">
            {t('payment.beta.timeline.title')}
          </h2>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 transform -translate-y-1/2"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-xl z-10 relative">
                    1
                  </div>
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('payment.beta.timeline.step1.title')}</h3>
                <p className="text-gray-600">{t('payment.beta.timeline.step1.desc')}</p>
              </div>
              
              {/* Step 2 */}
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-xl z-10 relative">
                    2
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('payment.beta.timeline.step2.title')}</h3>
                <p className="text-gray-600">{t('payment.beta.timeline.step2.desc')}</p>
              </div>
              
              {/* Step 3 */}
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-xl z-10 relative">
                    3
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('payment.beta.timeline.step3.title')}</h3>
                <p className="text-gray-600">{t('payment.beta.timeline.step3.desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('payment.beta.cta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            {t('payment.beta.cta.subtitle')}
          </p>
          
          <a
            href="https://forms.gle/B5qz5A9oWbwZ9RZn7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-white text-blue-600 hover:bg-blue-50 px-10 py-5 rounded-2xl text-lg font-bold transition-all shadow-2xl hover:shadow-3xl hover:scale-105 transform"
          >
            <ExternalLinkIcon className="h-6 w-6 mr-3" />
            {t('payment.beta.cta.button')}
          </a>
          
          <div className="mt-12 pt-12 border-t border-white/20">
            <p className="text-blue-100 mb-4">
              {t('payment.beta.contact.question')}
            </p>
            <a
              href="mailto:optichainAI@gmail.com"
              className="text-white hover:text-blue-100 font-semibold text-lg transition-colors"
            >
              {t('payment.beta.contact.email')}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}