'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'th'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
  en: {
    // Navigation
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.about': 'About',
    'nav.getStarted': 'Get Started',
    
    // Hero Section
    'hero.badge': 'Scan • Inventory • Analytics • Transactions',
    'hero.title': 'Inventory you can trust. Fast.',
    'hero.subtitle': 'OptiChain is the clean, no-nonsense way to keep stock accurate—scan items, control levels, see what moved, and spot issues instantly.',
    'hero.startFree': 'Start Free',
    'hero.watchDemo': 'Watch Demo',
    'hero.kpi1': '< 2s',
    'hero.kpi1Label': 'Per-scan speed',
    'hero.kpi2': '99.9%',
    'hero.kpi2Label': 'Stock accuracy (target)',
    'hero.kpi3': 'Zero',
    'hero.kpi3Label': 'Spreadsheet chaos',
    'hero.kpi4': 'All day',
    'hero.kpi4Label': 'Audit-ready logs',
    
    // Features Section
    'features.title': 'Core tools that just work',
    'features.subtitle': 'Everything you need today. Nothing you don\'t.',
    'features.scanner.title': 'Mobile Scanner',
    'features.scanner.desc': 'Lightning-fast barcode/QR scans from your phone. Instant add, receive, and adjust.',
    'features.inventory.title': 'Inventory Control',
    'features.inventory.desc': 'Simple, reliable stock counts by SKU and location. Clear statuses and bulk edits.',
    'features.analytics.title': 'Smart Analytics',
    'features.analytics.desc': 'Clean dashboards for movement, top SKUs, shrinkage flags, and basic velocity.',
    'features.transactions.title': 'Transactions Timeline',
    'features.transactions.desc': 'Every in/out/adjustment in one audit-ready feed. Search, filter, and export.',
    
    // How it works
    'howItWorks.title': 'Your daily flow',
    'howItWorks.step1.title': 'Scan',
    'howItWorks.step1.desc': 'Receive or adjust items with your phone.',
    'howItWorks.step2.title': 'Manage',
    'howItWorks.step2.desc': 'Keep counts tidy with bulk edits and locations.',
    'howItWorks.step3.title': 'Review',
    'howItWorks.step3.desc': 'Open the timeline and analytics to spot issues fast.',
    
    // Pricing Section
    'pricing.title': 'Simple, transparent pricing',
    'pricing.subtitle': 'Start free. Upgrade when you add more SKUs or users.',
    'pricing.starter.title': 'Starter',
    'pricing.starter.price': 'Free',
    'pricing.starter.period': '/month',
    'pricing.starter.blurb': 'Try OptiChain with a small catalog',
    'pricing.starter.feature1': 'Up to 100 SKUs',
    'pricing.starter.feature2': 'Mobile scanner',
    'pricing.starter.feature3': 'Inventory control',
    'pricing.starter.feature4': 'Transactions timeline (30-day history)',
    'pricing.starter.feature5': 'Basic analytics dashboard',
    'pricing.starter.cta': 'Get Started',
    'pricing.pro.badge': 'Most Popular',
    'pricing.pro.title': 'Pro',
    'pricing.pro.price': '฿1,290',
    'pricing.pro.period': '/month',
    'pricing.pro.blurb': 'For growing stores',
    'pricing.pro.feature1': 'Up to 2,000 SKUs',
    'pricing.pro.feature2': 'Advanced filters & exports',
    'pricing.pro.feature3': 'User roles (up to 5)',
    'pricing.pro.feature4': '90-day transaction history',
    'pricing.pro.feature5': 'Email alerts (low stock)',
    'pricing.pro.cta': 'Start Free Trial',
    'pricing.enterprise.title': 'Enterprise',
    'pricing.enterprise.price': 'Custom',
    'pricing.enterprise.period': '.',
    'pricing.enterprise.blurb': 'For larger catalogs & workflows',
    'pricing.enterprise.feature1': 'Unlimited SKUs & users',
    'pricing.enterprise.feature2': 'Custom roles & SSO',
    'pricing.enterprise.feature3': 'Full audit history',
    'pricing.enterprise.feature4': 'Dedicated support',
    'pricing.enterprise.cta': 'Contact Sales',
    
    // About Section
    'about.title': 'Built for real-world ops',
    'about.subtitle': 'OptiChain focuses on the essentials: fast scanning, accurate counts, and crystal-clear history. It\'s the clean foundation your team can rely on every day.',
    'about.feature1.title': 'Fast & simple',
    'about.feature1.desc': 'No steep learning curve—teams can use it in minutes.',
    'about.feature2.title': 'Reliable records',
    'about.feature2.desc': 'Audit-ready transaction logs and exports.',
    'about.feature3.title': 'Grows with you',
    'about.feature3.desc': 'Add users, SKUs, and alerts as you scale.',
    'about.cta.title': 'Ready to clean up inventory?',
    'about.cta.subtitle': 'Join stores using OptiChain to eliminate guesswork and keep stock tight.',
    'about.cta.button': 'Start Your Free Trial',
    
    // Mobile Experience
    'mobile.title': 'Mobile-First Design',
    'mobile.subtitle': 'Scan barcodes, manage inventory, and track transactions—all from your phone.',
    'mobile.lightning.title': 'Lightning Fast',
    'mobile.lightning.desc': 'Scan and process barcodes in under 2 seconds with our optimized recognition engine.',
    'mobile.offline.title': 'Offline Ready',
    'mobile.offline.desc': 'Works without internet connection. Syncs automatically when back online.',
    'mobile.device.title': 'Any Device',
    'mobile.device.desc': 'Works on iOS, Android, and web browsers. No app installation required.',
    'mobile.sync.title': 'Real-time Sync',
    'mobile.sync.desc': 'All changes sync instantly across all devices and team members.',
    
    // Payment/Beta Page
    'payment.beta.badge': 'Beta Version',
    'payment.beta.title': 'Join Our Beta Program',
    'payment.beta.subtitle': 'Be among the first to experience OptiChain\'s powerful inventory management features. Help us shape the future of inventory control.',
    'payment.beta.feature1.title': 'Early Access',
    'payment.beta.feature1.desc': 'Get exclusive access to new features before public release.',
    'payment.beta.feature2.title': 'Direct Feedback',
    'payment.beta.feature2.desc': 'Share your feedback directly with our development team.',
    'payment.beta.feature3.title': 'Free During Beta',
    'payment.beta.feature3.desc': 'Enjoy all features at no cost during the beta period.',
    'payment.beta.cta.title': 'Ready to Get Started?',
    'payment.beta.cta.subtitle': 'Apply for beta access and help us build the perfect inventory management solution.',
    'payment.beta.cta.button': 'Apply for Beta Access',
    'payment.beta.cta.note': 'Beta applications are reviewed within 2-3 business days',
    'payment.beta.timeline.title': 'How It Works',
    'payment.beta.timeline.step1.title': 'Apply',
    'payment.beta.timeline.step1.desc': 'Fill out our beta application form',
    'payment.beta.timeline.step2.title': 'Review',
    'payment.beta.timeline.step2.desc': 'We review your application',
    'payment.beta.timeline.step3.title': 'Access',
    'payment.beta.timeline.step3.desc': 'Get your beta access credentials',
    'payment.beta.contact.question': 'Have questions about the beta program?',
    'payment.beta.contact.email': 'Contact us at beta@optichain.com',
    
    // Footer
    'footer.tagline': 'Scan, manage, analyze, and review—without the mess.',
    'footer.product': 'Product',
    'footer.resources': 'Resources',
    'footer.company': 'Company',
    'footer.copyright': 'All rights reserved.'
  },
  th: {
    // Navigation
    'nav.features': 'ฟีเจอร์',
    'nav.pricing': 'ราคา',
    'nav.about': 'เกี่ยวกับ',
    'nav.getStarted': 'เริ่มต้น',
    
    // Hero Section
    'hero.badge': 'สแกน • สต็อก • วิเคราะห์ • ธุรกรรม',
    'hero.title': 'ระบบสต็อกที่เชื่อถือได้ เร็ว',
    'hero.subtitle': 'OptiChain เป็นวิธีที่เรียบง่ายและตรงไปตรงมาในการรักษาความแม่นยำของสต็อก—สแกนสินค้า ควบคุมระดับ ดูการเคลื่อนไหว และพบปัญหาทันที',
    'hero.startFree': 'เริ่มฟรี',
    'hero.watchDemo': 'ดูตัวอย่าง',
    'hero.kpi1': '< 2 วินาที',
    'hero.kpi1Label': 'ความเร็วต่อการสแกน',
    'hero.kpi2': '99.9%',
    'hero.kpi2Label': 'ความแม่นยำของสต็อก (เป้าหมาย)',
    'hero.kpi3': 'ศูนย์',
    'hero.kpi3Label': 'ความยุ่งเหยิงจากสเปรดชีต',
    'hero.kpi4': 'ตลอดวัน',
    'hero.kpi4Label': 'บันทึกพร้อมตรวจสอบ',
    
    // Features Section
    'features.title': 'เครื่องมือหลักที่ใช้งานได้จริง',
    'features.subtitle': 'ทุกสิ่งที่คุณต้องการวันนี้ ไม่มีอะไรที่คุณไม่ต้องการ',
    'features.scanner.title': 'เครื่องสแกนมือถือ',
    'features.scanner.desc': 'สแกนบาร์โค้ด/QR อย่างรวดเร็วจากโทรศัพท์ของคุณ เพิ่ม รับ และปรับปรุงทันที',
    'features.inventory.title': 'การควบคุมสต็อก',
    'features.inventory.desc': 'นับสต็อกที่เรียบง่ายและเชื่อถือได้ตาม SKU และตำแหน่ง สถานะที่ชัดเจนและการแก้ไขแบบกลุ่ม',
    'features.analytics.title': 'การวิเคราะห์อัจฉริยะ',
    'features.analytics.desc': 'แดชบอร์ดที่สะอาดสำหรับการเคลื่อนไหว SKU ยอดนิยม สัญญาณการหดตัว และความเร็วพื้นฐาน',
    'features.transactions.title': 'ไทม์ไลน์ธุรกรรม',
    'features.transactions.desc': 'ทุกการเข้า/ออก/ปรับปรุงในฟีดเดียวที่พร้อมตรวจสอบ ค้นหา กรอง และส่งออก',
    
    // How it works
    'howItWorks.title': 'ขั้นตอนการทำงานประจำวันของคุณ',
    'howItWorks.step1.title': 'สแกน',
    'howItWorks.step1.desc': 'รับหรือปรับปรุงสินค้าด้วยโทรศัพท์ของคุณ',
    'howItWorks.step2.title': 'จัดการ',
    'howItWorks.step2.desc': 'รักษาการนับให้เป็นระเบียบด้วยการแก้ไขแบบกลุ่มและตำแหน่ง',
    'howItWorks.step3.title': 'ตรวจสอบ',
    'howItWorks.step3.desc': 'เปิดไทม์ไลน์และการวิเคราะห์เพื่อพบปัญหาอย่างรวดเร็ว',
    
    // Pricing Section
    'pricing.title': 'ราคาที่เรียบง่ายและโปร่งใส',
    'pricing.subtitle': 'เริ่มฟรี อัปเกรดเมื่อคุณเพิ่ม SKU หรือผู้ใช้มากขึ้น',
    'pricing.starter.title': 'เริ่มต้น',
    'pricing.starter.price': 'ฟรี',
    'pricing.starter.period': '/เดือน',
    'pricing.starter.blurb': 'ลองใช้ OptiChain กับแคตตาล็อกเล็กๆ',
    'pricing.starter.feature1': 'สูงสุด 100 SKU',
    'pricing.starter.feature2': 'เครื่องสแกนมือถือ',
    'pricing.starter.feature3': 'การควบคุมสต็อก',
    'pricing.starter.feature4': 'ไทม์ไลน์ธุรกรรม (ประวัติ 30 วัน)',
    'pricing.starter.feature5': 'แดชบอร์ดการวิเคราะห์พื้นฐาน',
    'pricing.starter.cta': 'เริ่มต้น',
    'pricing.pro.badge': 'ยอดนิยม',
    'pricing.pro.title': 'มืออาชีพ',
    'pricing.pro.price': '฿1,290',
    'pricing.pro.period': '/เดือน',
    'pricing.pro.blurb': 'สำหรับร้านค้าที่เติบโต',
    'pricing.pro.feature1': 'สูงสุด 2,000 SKU',
    'pricing.pro.feature2': 'ตัวกรองและส่งออกขั้นสูง',
    'pricing.pro.feature3': 'บทบาทผู้ใช้ (สูงสุด 5)',
    'pricing.pro.feature4': 'ประวัติธุรกรรม 90 วัน',
    'pricing.pro.feature5': 'การแจ้งเตือนทางอีเมล (สต็อกต่ำ)',
    'pricing.pro.cta': 'เริ่มทดลองฟรี',
    'pricing.enterprise.title': 'องค์กร',
    'pricing.enterprise.price': 'กำหนดเอง',
    'pricing.enterprise.period': '.',
    'pricing.enterprise.blurb': 'สำหรับแคตตาล็อกและเวิร์กโฟลว์ขนาดใหญ่',
    'pricing.enterprise.feature1': 'SKU และผู้ใช้ไม่จำกัด',
    'pricing.enterprise.feature2': 'บทบาทและ SSO ที่กำหนดเอง',
    'pricing.enterprise.feature3': 'ประวัติการตรวจสอบเต็มรูปแบบ',
    'pricing.enterprise.feature4': 'การสนับสนุนเฉพาะ',
    'pricing.enterprise.cta': 'ติดต่อฝ่ายขาย',
    
    // About Section
    'about.title': 'สร้างขึ้นสำหรับการดำเนินงานจริง',
    'about.subtitle': 'OptiChain มุ่งเน้นไปที่สิ่งสำคัญ: การสแกนที่รวดเร็ว การนับที่แม่นยำ และประวัติที่ชัดเจน เป็นรากฐานที่สะอาดที่ทีมของคุณสามารถพึ่งพาได้ทุกวัน',
    'about.feature1.title': 'เร็วและเรียบง่าย',
    'about.feature1.desc': 'ไม่มีเส้นโค้งการเรียนรู้ที่ชัน—ทีมสามารถใช้งานได้ในไม่กี่นาที',
    'about.feature2.title': 'บันทึกที่เชื่อถือได้',
    'about.feature2.desc': 'บันทึกธุรกรรมและส่งออกที่พร้อมตรวจสอบ',
    'about.feature3.title': 'เติบโตไปกับคุณ',
    'about.feature3.desc': 'เพิ่มผู้ใช้ SKU และการแจ้งเตือนเมื่อคุณขยายตัว',
    'about.cta.title': 'พร้อมที่จะทำความสะอาดสต็อกแล้วหรือยัง?',
    'about.cta.subtitle': 'เข้าร่วมกับร้านค้าที่ใช้ OptiChain เพื่อขจัดการเดาและรักษาสต็อกให้แน่น',
    'about.cta.button': 'เริ่มทดลองฟรีของคุณ',
    
    // Mobile Experience
    'mobile.title': 'ออกแบบสำหรับมือถือเป็นหลัก',
    'mobile.subtitle': 'สแกนบาร์โค้ด จัดการสต็อก และติดตามธุรกรรม—ทั้งหมดจากโทรศัพท์ของคุณ',
    'mobile.lightning.title': 'เร็วเหมือนฟ้าผ่า',
    'mobile.lightning.desc': 'สแกนและประมวลผลบาร์โค้ดในเวลาไม่ถึง 2 วินาทีด้วยเครื่องมือจดจำที่ปรับปรุงแล้ว',
    'mobile.offline.title': 'พร้อมใช้งานออฟไลน์',
    'mobile.offline.desc': 'ทำงานได้โดยไม่ต้องเชื่อมต่ออินเทอร์เน็ต ซิงค์อัตโนมัติเมื่อกลับมาออนไลน์',
    'mobile.device.title': 'ทุกอุปกรณ์',
    'mobile.device.desc': 'ทำงานบน iOS, Android และเว็บเบราว์เซอร์ ไม่ต้องติดตั้งแอป',
    'mobile.sync.title': 'ซิงค์แบบเรียลไทม์',
    'mobile.sync.desc': 'การเปลี่ยนแปลงทั้งหมดซิงค์ทันทีข้ามอุปกรณ์และสมาชิกทีมทั้งหมด',
    
    // Payment/Beta Page
    'payment.beta.badge': 'เวอร์ชันเบต้า',
    'payment.beta.title': 'เข้าร่วมโปรแกรมเบต้าของเรา',
    'payment.beta.subtitle': 'เป็นหนึ่งในคนแรกที่ได้สัมผัสฟีเจอร์การจัดการสต็อกที่ทรงพลังของ OptiChain ช่วยเราสร้างอนาคตของการควบคุมสต็อก',
    'payment.beta.feature1.title': 'เข้าถึงก่อนใคร',
    'payment.beta.feature1.desc': 'เข้าถึงฟีเจอร์ใหม่ก่อนการเปิดตัวสู่สาธารณะ',
    'payment.beta.feature2.title': 'ฟีดแบ็กโดยตรง',
    'payment.beta.feature2.desc': 'แบ่งปันความคิดเห็นของคุณโดยตรงกับทีมพัฒนา',
    'payment.beta.feature3.title': 'ฟรีในช่วงเบต้า',
    'payment.beta.feature3.desc': 'เพลิดเพลินกับฟีเจอร์ทั้งหมดโดยไม่เสียค่าใช้จ่ายในช่วงเบต้า',
    'payment.beta.cta.title': 'พร้อมเริ่มต้นแล้วหรือยัง?',
    'payment.beta.cta.subtitle': 'สมัครเข้าร่วมเบต้าและช่วยเราสร้างโซลูชันการจัดการสต็อกที่สมบูรณ์แบบ',
    'payment.beta.cta.button': 'สมัครเข้าร่วมเบต้า',
    'payment.beta.cta.note': 'การสมัครเบต้าจะได้รับการพิจารณาภายใน 2-3 วันทำการ',
    'payment.beta.timeline.title': 'วิธีการทำงาน',
    'payment.beta.timeline.step1.title': 'สมัคร',
    'payment.beta.timeline.step1.desc': 'กรอกแบบฟอร์มสมัครเบต้าของเรา',
    'payment.beta.timeline.step2.title': 'พิจารณา',
    'payment.beta.timeline.step2.desc': 'เราพิจารณาการสมัครของคุณ',
    'payment.beta.timeline.step3.title': 'เข้าถึง',
    'payment.beta.timeline.step3.desc': 'รับข้อมูลเข้าถึงเบต้าของคุณ',
    'payment.beta.contact.question': 'มีคำถามเกี่ยวกับโปรแกรมเบต้า?',
    'payment.beta.contact.email': 'ติดต่อเราที่ beta@optichain.com',
    
    // Footer
    'footer.tagline': 'สแกน จัดการ วิเคราะห์ และตรวจสอบ—โดยไม่ยุ่งเหยิง',
    'footer.product': 'ผลิตภัณฑ์',
    'footer.resources': 'ทรัพยากร',
    'footer.company': 'บริษัท',
    'footer.copyright': 'สงวนลิขสิทธิ์ทั้งหมด'
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    // Check localStorage for saved language preference
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'th')) {
      setLanguage(savedLanguage)
    } else {
      // Detect browser language
      const browserLang = navigator.language.split('-')[0]
      if (browserLang === 'th') {
        setLanguage('th')
      } else {
        setLanguage('en')
      }
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
