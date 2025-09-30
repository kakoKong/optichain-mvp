'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeftIcon, TargetIcon, UsersIcon, ZapIcon } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image src="/OptichainLogo.png" alt="OptiChain" width={40} height={40} className="mr-3" />
              <span className="text-xl font-bold tracking-tight text-gray-900">OptiChain</span>
            </Link>
            <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">About OptiChain</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-600 mb-8">
            OptiChain is a modern inventory management solution designed to help businesses maintain accurate stock levels, streamline operations, and make data-driven decisions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-12">
            <div className="bg-blue-50 rounded-2xl p-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                <TargetIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Mission</h3>
              <p className="text-gray-600">To simplify inventory management and empower businesses with real-time insights.</p>
            </div>

            <div className="bg-green-50 rounded-2xl p-6">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                <ZapIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Vision</h3>
              <p className="text-gray-600">To become the go-to platform for inventory control across Southeast Asia.</p>
            </div>

            <div className="bg-purple-50 rounded-2xl p-6">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Values</h3>
              <p className="text-gray-600">Simplicity, reliability, and continuous improvement through user feedback.</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-4">What We Do</h2>
          <p className="text-gray-600 mb-4">
            OptiChain provides a comprehensive suite of tools for inventory management, including:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-8">
            <li>Lightning-fast barcode scanning</li>
            <li>Real-time inventory tracking</li>
            <li>Smart analytics and reporting</li>
            <li>Transaction history and audit trails</li>
            <li>Multi-user collaboration</li>
          </ul>

          <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-4">Contact Us</h2>
          <p className="text-gray-600 mb-4">
            Have questions or want to learn more? Reach out to us:
          </p>
          <p className="text-gray-600">
            Email: <a href="mailto:optichainAI@gmail.com" className="text-blue-600 hover:text-blue-700 font-medium">optichainAI@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
