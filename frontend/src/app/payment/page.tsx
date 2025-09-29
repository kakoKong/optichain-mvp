'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ArrowLeftIcon, ClockIcon, UsersIcon, StarIcon, ExternalLinkIcon } from 'lucide-react'

export default function PaymentPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image src="/OptichainLogo.png" alt="OptiChain" width={40} height={40} className="mr-3" />
              <span className="text-xl font-bold tracking-tight text-gray-900">OptiChain</span>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Home
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 rounded-full px-4 py-2 mb-6">
            <StarIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{t('payment.beta.badge')}</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
            {t('payment.beta.title')}
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {t('payment.beta.subtitle')}
          </p>
        </div>

        {/* Beta Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('payment.beta.feature1.title')}</h3>
            <p className="text-gray-600">{t('payment.beta.feature1.desc')}</p>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('payment.beta.feature2.title')}</h3>
            <p className="text-gray-600">{t('payment.beta.feature2.desc')}</p>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <StarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('payment.beta.feature3.title')}</h3>
            <p className="text-gray-600">{t('payment.beta.feature3.desc')}</p>
          </div>
        </div>

        {/* Beta Application CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-center text-white">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('payment.beta.cta.title')}
            </h2>
            <p className="text-lg md:text-xl text-blue-100 mb-8">
              {t('payment.beta.cta.subtitle')}
            </p>
            
            <div className="space-y-4">
              <a
                href="https://forms.gle/your-beta-form-link"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg"
              >
                <ExternalLinkIcon className="h-5 w-5 mr-2" />
                {t('payment.beta.cta.button')}
              </a>
              
              <p className="text-sm text-blue-200">
                {t('payment.beta.cta.note')}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-16 bg-white rounded-2xl border shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            {t('payment.beta.timeline.title')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{t('payment.beta.timeline.step1.title')}</h4>
              <p className="text-gray-600 text-sm">{t('payment.beta.timeline.step1.desc')}</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{t('payment.beta.timeline.step2.title')}</h4>
              <p className="text-gray-600 text-sm">{t('payment.beta.timeline.step2.desc')}</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{t('payment.beta.timeline.step3.title')}</h4>
              <p className="text-gray-600 text-sm">{t('payment.beta.timeline.step3.desc')}</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            {t('payment.beta.contact.question')}
          </p>
          <a
            href="mailto:beta@optichain.com"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('payment.beta.contact.email')}
          </a>
        </div>
      </div>
    </div>
  )
}
