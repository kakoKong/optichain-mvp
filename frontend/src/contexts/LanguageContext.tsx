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
    'hero.title': 'Inventory you can trust—fast.',
    'hero.subtitle': 'OptiChain is the clean, no-nonsense way to keep stock accurate. Scan items, control levels, see movement, and catch issues in seconds.',
    'hero.startFree': 'Start Free',
    'hero.watchDemo': 'Watch Demo',
    'hero.kpi1': '< 2s',
    'hero.kpi1Label': 'Scan to save',
    'hero.kpi2': '99.9%',
    'hero.kpi2Label': 'Stock accuracy (target)',
    'hero.kpi3': 'Zero',
    'hero.kpi3Label': 'Spreadsheet chaos',
    'hero.kpi4': 'All day',
    'hero.kpi4Label': 'Audit-ready logs',

    // Features Section
    'features.title': 'Core tools that just work',
    'features.subtitle': 'Everything you need today—nothing you don’t.',
    'features.scanner.title': 'Mobile Scanner',
    'features.scanner.desc': 'Lightning-fast barcode/QR scans from your phone. Add, receive, and adjust instantly.',
    'features.inventory.title': 'Inventory Control',
    'features.inventory.desc': 'Reliable counts by SKU and location. Clear statuses, bulk edits, less guesswork.',
    'features.analytics.title': 'Smart Analytics',
    'features.analytics.desc': 'Clean dashboards for movement, top SKUs, shrinkage flags, and basic velocity.',
    'features.transactions.title': 'Transactions Timeline',
    'features.transactions.desc': 'Every in/out/adjustment in one audit-ready feed. Search, filter, export—done.',

    // How it works
    'howItWorks.title': 'Your daily flow',
    'howItWorks.step1.title': 'Scan',
    'howItWorks.step1.desc': 'Receive or adjust items with your phone.',
    'howItWorks.step2.title': 'Manage',
    'howItWorks.step2.desc': 'Keep counts tidy with bulk edits and locations.',
    'howItWorks.step3.title': 'Review',
    'howItWorks.step3.desc': 'Open the timeline and analytics to spot issues fast.',

    // Pricing Section
    'pricing.title': 'Clear, fair pricing',
    'pricing.subtitle': 'Start free. Upgrade when you add more SKUs or users.',
    'pricing.comingSoon': 'Coming Soon',
    'pricing.starter.title': 'Starter',
    'pricing.starter.price': 'Free',
    'pricing.starter.period': '/month',
    'pricing.starter.blurb': 'Test OptiChain with a small catalog',
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
    'pricing.enterprise.period': '',
    'pricing.enterprise.blurb': 'For larger catalogs & workflows',
    'pricing.enterprise.feature1': 'Unlimited SKUs & users',
    'pricing.enterprise.feature2': 'Custom roles & SSO',
    'pricing.enterprise.feature3': 'Full audit history',
    'pricing.enterprise.feature4': 'Dedicated support',
    'pricing.enterprise.cta': 'Contact Sales',

    // About Section
    'about.title': 'Built for real-world ops',
    'about.subtitle': 'OptiChain focuses on the essentials: fast scanning, accurate counts, and crystal-clear history—the solid foundation your team can rely on every day.',
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
    'mobile.title': 'Mobile-first design',
    'mobile.subtitle': 'Scan barcodes, manage inventory, and track transactions—all from your phone.',
    'mobile.lightning.title': 'Lightning fast',
    'mobile.lightning.desc': 'Scan and process barcodes in under 2 seconds with our optimized engine.',
    'mobile.offline.title': 'LINE Mini App',
    'mobile.offline.desc': 'Integrated right into LINE—no separate app download needed. Access from your LINE app.',
    'mobile.device.title': 'Any device',
    'mobile.device.desc': 'iOS, Android, and web browsers—no installs required.',
    'mobile.sync.title': 'Real-time sync',
    'mobile.sync.desc': 'Changes update instantly across devices and team members.',

    // Demo Page
    'demo.badge': 'Product Demo',
    'demo.title': 'See OptiChain in Action',
    'demo.subtitle': 'Watch our comprehensive demo to see how OptiChain can transform your inventory management.',
    'demo.duration': 'Duration: ~12 minutes',
    'demo.learn.title': 'What You\'ll Learn',
    'demo.learn.subtitle': 'This demo covers everything you need to know to get started with OptiChain.',
    'demo.learn.feature1.title': 'Quick Setup',
    'demo.learn.feature1.desc': 'Learn how to set up your business and start managing inventory in minutes.',
    'demo.learn.feature2.title': 'Core Features',
    'demo.learn.feature2.desc': 'Explore scanning, inventory control, and transaction management.',
    'demo.learn.feature3.title': 'Best Practices',
    'demo.learn.feature3.desc': 'Discover tips and tricks to maximize efficiency and accuracy.',
    'demo.chapters.title': 'Video Chapters',
    'demo.chapters.chapter1.title': 'Introduction & Overview',
    'demo.chapters.chapter1.desc': 'Get familiar with OptiChain\'s interface and key features',
    'demo.chapters.chapter2.title': 'Mobile Scanner',
    'demo.chapters.chapter2.desc': 'Learn how to scan barcodes and manage stock on-the-go',
    'demo.chapters.chapter3.title': 'Inventory Management',
    'demo.chapters.chapter3.desc': 'Add products, track stock levels, and set alerts',
    'demo.chapters.chapter4.title': 'Analytics Dashboard',
    'demo.chapters.chapter4.desc': 'View insights, trends, and make data-driven decisions',
    'demo.chapters.chapter5.title': 'Team Collaboration',
    'demo.chapters.chapter5.desc': 'Invite team members and manage permissions',
    'demo.cta.title': 'Ready to Get Started?',
    'demo.cta.subtitle': 'Join our beta program and experience OptiChain for yourself.',
    'demo.cta.button': 'Start Free Trial',
    'demo.cta.explore': 'Explore Features',
    
    // Payment/Beta Page
    'payment.beta.badge': 'Beta Version',
    'payment.beta.title': 'Join our Beta Program',
    'payment.beta.subtitle': 'Be among the first to experience OptiChain’s powerful inventory tools—and help shape what comes next.',
    'payment.beta.feature1.title': 'Early access',
    'payment.beta.feature1.desc': 'Try new features before public release.',
    'payment.beta.feature2.title': 'Direct feedback',
    'payment.beta.feature2.desc': 'Talk directly to our product team.',
    'payment.beta.feature3.title': 'Free during beta',
    'payment.beta.feature3.desc': 'Enjoy all features at no cost while in beta.',
    'payment.beta.cta.title': 'Ready to get started?',
    'payment.beta.cta.subtitle': 'Apply for beta access and help us build the perfect inventory solution.',
    'payment.beta.cta.button': 'Apply for Beta Access',
    'payment.beta.cta.note': 'Applications reviewed within 2–3 business days',
    'payment.beta.timeline.title': 'How it works',
    'payment.beta.timeline.step1.title': 'Apply',
    'payment.beta.timeline.step1.desc': 'Fill out the beta application form',
    'payment.beta.timeline.step2.title': 'Review',
    'payment.beta.timeline.step2.desc': 'We review your application',
    'payment.beta.timeline.step3.title': 'Access',
    'payment.beta.timeline.step3.desc': 'Receive your beta credentials',
    'payment.beta.contact.question': 'Have questions about the beta?',
    'payment.beta.contact.email': 'Contact us at optichainAI@gmail.com',

    // Footer
    'footer.tagline': 'Scan, manage, analyze, and review—without the mess.',
    'footer.product': 'Product',
    'footer.company': 'Company',
    'footer.about': 'About Us',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
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
    'hero.title': 'สต็อกแม่นยำไว้ใจได้—รวดเร็ว.',
    'hero.subtitle': 'OptiChain คือวิธีที่เรียบง่ายแต่ทรงพลังในการดูแลสต็อกให้แม่นยำ สแกนสินค้า คุมระดับ ดูความเคลื่อนไหว และเจอปัญหาได้ในไม่กี่วินาที',
    'hero.startFree': 'เริ่มฟรี',
    'hero.watchDemo': 'ดู Demo',
    'hero.kpi1': '< 2 วินาที',
    'hero.kpi1Label': 'สแกนเสร็จใน',
    'hero.kpi2': '99.9%',
    'hero.kpi2Label': 'ความแม่นยำของสต็อก (เป้าหมาย)',
    'hero.kpi3': '0',
    'hero.kpi3Label': 'ความวุ่นวายจากสเปรดชีต',
    'hero.kpi4': 'All Day',
    'hero.kpi4Label': 'บันทึก audit logs',

    // Features Section
    'features.title': 'เครื่องมือหลัก ใช้งานได้จริง',
    'features.subtitle': 'ครบเท่าที่จำเป็น—ไม่ยัดเยียด',
    'features.scanner.title': 'สแกนผ่านมือถือ',
    'features.scanner.desc': 'สแกนบาร์โค้ด/QR ได้รวดเร็วจากโทรศัพท์ เพิ่ม รับ และปรับสต็อกได้ทันที',
    'features.inventory.title': 'ควบคุมสต็อก',
    'features.inventory.desc': 'นับสต็อกตาม SKU และตำแหน่งอย่างแม่นยำ สถานะชัดเจน แก้ไขแบบกลุ่มได้',
    'features.analytics.title': 'วิเคราะห์อัจฉริยะ',
    'features.analytics.desc': 'แดชบอร์ดสะอาดตา ดูการเคลื่อนไหว SKU เด่น สัญญาณสูญหาย และความเร็วพื้นฐาน',
    'features.transactions.title': 'ไทม์ไลน์ธุรกรรม',
    'features.transactions.desc': 'รวมทุก รับ/จ่าย/ปรับ ในฟีดเดียว ค้นหา กรอง และส่งออกได้ทันที',

    // How it works
    'howItWorks.title': 'ลูปการทำงานประจำวัน',
    'howItWorks.step1.title': 'สแกน',
    'howItWorks.step1.desc': 'รับเข้า/ปรับสต็อกได้จากมือถือ',
    'howItWorks.step2.title': 'จัดการ',
    'howItWorks.step2.desc': 'รักษายอดให้เป๊ะด้วยตำแหน่งและการแก้ไขแบบกลุ่ม',
    'howItWorks.step3.title': 'ตรวจสอบ',
    'howItWorks.step3.desc': 'เปิดไทม์ไลน์และแดชบอร์ดเพื่อจับปัญหาให้ไว',

    // Pricing Section
    'pricing.title': 'ราคาเข้าใจง่าย ตรงไปตรงมา',
    'pricing.subtitle': 'เริ่มฟรี แล้วค่อยอัปเกรดเมื่อมี SKU หรือผู้ใช้มากขึ้น',
    'pricing.comingSoon': 'เร็ว ๆ นี้',
    'pricing.starter.title': 'เริ่มต้น',
    'pricing.starter.price': 'ฟรี',
    'pricing.starter.period': '/เดือน',
    'pricing.starter.blurb': 'ลองใช้ OptiChain กับแคตตาล็อกขนาดเล็ก',
    'pricing.starter.feature1': 'สูงสุด 100 SKU',
    'pricing.starter.feature2': 'สแกนผ่านมือถือ',
    'pricing.starter.feature3': 'ควบคุมสต็อก',
    'pricing.starter.feature4': 'ไทม์ไลน์ธุรกรรม (ย้อนหลัง 30 วัน)',
    'pricing.starter.feature5': 'แดชบอร์ดพื้นฐาน',
    'pricing.starter.cta': 'เริ่มต้น',
    'pricing.pro.badge': 'ยอดนิยม',
    'pricing.pro.title': 'โปร',
    'pricing.pro.price': '฿1,290',
    'pricing.pro.period': '/เดือน',
    'pricing.pro.blurb': 'เหมาะสำหรับร้านที่กำลังเติบโต',
    'pricing.pro.feature1': 'สูงสุด 2,000 SKU',
    'pricing.pro.feature2': 'ตัวกรองขั้นสูง & ส่งออกข้อมูล',
    'pricing.pro.feature3': 'กำหนดบทบาทผู้ใช้ (สูงสุด 5)',
    'pricing.pro.feature4': 'ประวัติธุรกรรม 90 วัน',
    'pricing.pro.feature5': 'อีเมลเตือนสต็อกต่ำ',
    'pricing.pro.cta': 'เริ่มทดลองฟรี',
    'pricing.enterprise.title': 'เอนเตอร์ไพรส์',
    'pricing.enterprise.price': 'กำหนดเอง',
    'pricing.enterprise.period': '',
    'pricing.enterprise.blurb': 'สำหรับแคตตาล็อกใหญ่และเวิร์กโฟลว์ซับซ้อน',
    'pricing.enterprise.feature1': 'SKU และผู้ใช้ไม่จำกัด',
    'pricing.enterprise.feature2': 'บทบาทเฉพาะ & SSO',
    'pricing.enterprise.feature3': 'ประวัติการตรวจสอบครบถ้วน',
    'pricing.enterprise.feature4': 'ผู้ดูแลลูกค้าเฉพาะทาง',
    'pricing.enterprise.cta': 'ติดต่อฝ่ายขาย',

    // About Section
    'about.title': 'ออกแบบเพื่อการปฏิบัติงานจริง',
    'about.subtitle': 'โฟกัสที่สิ่งสำคัญ: สแกนเร็ว นับแม่น ประวัติชัดเจน คือรากฐานที่ทีมคุณพึ่งพาได้ทุกวัน',
    'about.feature1.title': 'เร็วและใช้ง่าย',
    'about.feature1.desc': 'เรียนรู้น้อย ใช้งานได้ในไม่กี่นาที',
    'about.feature2.title': 'บันทึกน่าเชื่อถือ',
    'about.feature2.desc': 'บันทึกธุรกรรมพร้อมตรวจสอบและส่งออกได้',
    'about.feature3.title': 'เติบโตไปด้วยกัน',
    'about.feature3.desc': 'เพิ่มผู้ใช้ SKU และการแจ้งเตือนได้ตามการขยาย',
    'about.cta.title': 'พร้อมเคลียร์สต็อกให้เป๊ะหรือยัง?',
    'about.cta.subtitle': 'เข้าร่วมร้านค้าที่ใช้ OptiChain เพื่อลดการเดาและคุมสต็อกให้แน่น',
    'about.cta.button': 'เริ่มทดลองฟรี',

    // Mobile Experience
    'mobile.title': 'ออกแบบเพื่อมือถือเป็นหลัก',
    'mobile.subtitle': 'สแกน จัดการ ติดตามธุรกรรม—ครบจบในมือถือ',
    'mobile.lightning.title': 'เร็วทันใจ',
    'mobile.lightning.desc': 'สแกนและประมวลผลได้ในไม่ถึง 2 วินาทีด้วยเอนจินที่ปรับแต่ง',
    'mobile.offline.title': 'LINE Mini App',
    'mobile.offline.desc': 'ผู้รวมกับ LINE โดยตรง—ไม่ต้องดาวน์โหลดแอปแยก เข้าถึงได้จากแอป LINE ของคุณ',
    'mobile.device.title': 'รองรับทุกอุปกรณ์',
    'mobile.device.desc': 'iOS, Android และเว็บ ไม่ต้องติดตั้งแอป',
    'mobile.sync.title': 'ซิงก์แบบเรียลไทม์',
    'mobile.sync.desc': 'ข้อมูลอัปเดตทันทีข้ามอุปกรณ์และสมาชิกทีม',

    // Demo Page
    'demo.badge': 'สาธิตผลิตภัณฑ์',
    'demo.title': 'ชม OptiChain ในการทำงานจริง',
    'demo.subtitle': 'ดูการสาธิตที่ครอบคลุมของเราเพื่อดูว่า OptiChain สามารถเปลี่ยนแปลงการจัดการสต็อกของคุณได้อย่างไร',
    'demo.duration': 'ความยาว: ~12 นาที',
    'demo.learn.title': 'สิ่งที่คุณจะได้เรียนรู้',
    'demo.learn.subtitle': 'การสาธิตนี้ครอบคลุมทุกสิ่งที่คุณจำเป็นต้องรู้เพื่อเริ่มต้นใช้งาน OptiChain',
    'demo.learn.feature1.title': 'ตั้งค่าอย่างรวดเร็ว',
    'demo.learn.feature1.desc': 'เรียนรู้วิธีตั้งค่าธุรกิจและเริ่มจัดการสต็อกในไม่กี่นาที',
    'demo.learn.feature2.title': 'ฟีเจอร์หลัก',
    'demo.learn.feature2.desc': 'สำรวจการสแกน การควบคุมสต็อก และการจัดการธุรกรรม',
    'demo.learn.feature3.title': 'แนวทางปฏิบัติที่ดีที่สุด',
    'demo.learn.feature3.desc': 'ค้นพบเคล็ดลับและลูกเล่นเพื่อเพิ่มประสิทธิภาพและความแม่นยำสูงสุด',
    'demo.chapters.title': 'บทต่างๆ ในวิดีโอ',
    'demo.chapters.chapter1.title': 'แนะนำและภาพรวม',
    'demo.chapters.chapter1.desc': 'ทำความคุ้นเคยกับอินเทอร์เฟซและฟีเจอร์หลักของ OptiChain',
    'demo.chapters.chapter2.title': 'เครื่องสแกนมือถือ',
    'demo.chapters.chapter2.desc': 'เรียนรู้วิธีสแกนบาร์โค้ดและจัดการสต็อกขณะเดินทาง',
    'demo.chapters.chapter3.title': 'การจัดการสต็อก',
    'demo.chapters.chapter3.desc': 'เพิ่มสินค้า ติดตามระดับสต็อก และตั้งค่าการแจ้งเตือน',
    'demo.chapters.chapter4.title': 'แดชบอร์ดการวิเคราะห์',
    'demo.chapters.chapter4.desc': 'ดูข้อมูลเชิงลึก แนวโน้ม และตัดสินใจโดยใช้ข้อมูล',
    'demo.chapters.chapter5.title': 'การทำงานร่วมกันของทีม',
    'demo.chapters.chapter5.desc': 'เชิญสมาชิกทีมและจัดการสิทธิ์',
    'demo.cta.title': 'พร้อมเริ่มต้นแล้วหรือยัง?',
    'demo.cta.subtitle': 'เข้าร่วมโปรแกรมเบต้าของเราและสัมผัส OptiChain ด้วยตัวคุณเอง',
    'demo.cta.button': 'เริ่มทดลองฟรี',
    'demo.cta.explore': 'สำรวจฟีเจอร์',
    
    // Demo Page
    'demo.badge': 'สาธิตผลิตภัณฑ์',
    'demo.title': 'ชม OptiChain ในการทำงานจริง',
    'demo.subtitle': 'ดูการสาธิตที่ครอบคลุมของเราเพื่อดูว่า OptiChain สามารถเปลี่ยนแปลงการจัดการสต็อกของคุณได้อย่างไร',
    'demo.duration': 'ความยาว: ~12 นาที',
    'demo.learn.title': 'สิ่งที่คุณจะได้เรียนรู้',
    'demo.learn.subtitle': 'การสาธิตนี้ครอบคลุมทุกสิ่งที่คุณจำเป็นต้องรู้เพื่อเริ่มต้นใช้งาน OptiChain',
    'demo.learn.feature1.title': 'ตั้งค่าอย่างรวดเร็ว',
    'demo.learn.feature1.desc': 'เรียนรู้วิธีตั้งค่าธุรกิจและเริ่มจัดการสต็อกในไม่กี่นาที',
    'demo.learn.feature2.title': 'ฟีเจอร์หลัก',
    'demo.learn.feature2.desc': 'สำรวจการสแกน การควบคุมสต็อก และการจัดการธุรกรรม',
    'demo.learn.feature3.title': 'แนวทางปฏิบัติที่ดีที่สุด',
    'demo.learn.feature3.desc': 'ค้นพบเคล็ดลับและลูกเล่นเพื่อเพิ่มประสิทธิภาพและความแม่นยำสูงสุด',
    'demo.chapters.title': 'บทต่างๆ ในวิดีโอ',
    'demo.chapters.chapter1.title': 'แนะนำและภาพรวม',
    'demo.chapters.chapter1.desc': 'ทำความคุ้นเคยกับอินเทอร์เฟซและฟีเจอร์หลักของ OptiChain',
    'demo.chapters.chapter2.title': 'เครื่องสแกนมือถือ',
    'demo.chapters.chapter2.desc': 'เรียนรู้วิธีสแกนบาร์โค้ดและจัดการสต็อกขณะเดินทาง',
    'demo.chapters.chapter3.title': 'การจัดการสต็อก',
    'demo.chapters.chapter3.desc': 'เพิ่มสินค้า ติดตามระดับสต็อก และตั้งค่าการแจ้งเตือน',
    'demo.chapters.chapter4.title': 'แดชบอร์ดการวิเคราะห์',
    'demo.chapters.chapter4.desc': 'ดูข้อมูลเชิงลึก แนวโน้ม และตัดสินใจโดยใช้ข้อมูล',
    'demo.chapters.chapter5.title': 'การทำงานร่วมกันของทีม',
    'demo.chapters.chapter5.desc': 'เชิญสมาชิกทีมและจัดการสิทธิ์',
    'demo.cta.title': 'พร้อมเริ่มต้นแล้วหรือยัง?',
    'demo.cta.subtitle': 'เข้าร่วมโปรแกรมเบต้าของเราและสัมผัส OptiChain ด้วยตัวคุณเอง',
    'demo.cta.button': 'เริ่มทดลองฟรี',
    'demo.cta.explore': 'สำรวจฟีเจอร์',
    
    // Payment/Beta Page
    'payment.beta.badge': 'รุ่นเบต้า',
    'payment.beta.title': 'เข้าร่วมโปรแกรมเบต้า',
    'payment.beta.subtitle': 'เป็นกลุ่มแรกที่ได้ใช้เครื่องมือจัดการสต็อกทรงพลังของ OptiChain และช่วยกำหนดทิศทางฟีเจอร์ถัดไป',
    'payment.beta.feature1.title': 'เข้าถึงก่อนใคร',
    'payment.beta.feature1.desc': 'ทดลองฟีเจอร์ใหม่ก่อนเปิดสาธารณะ',
    'payment.beta.feature2.title': 'ฟีดแบ็กตรง',
    'payment.beta.feature2.desc': 'พูดคุยกับทีมพัฒนาได้โดยตรง',
    'payment.beta.feature3.title': 'ฟรีตลอดช่วงเบต้า',
    'payment.beta.feature3.desc': 'ใช้งานทุกฟีเจอร์ได้โดยไม่มีค่าใช้จ่าย',
    'payment.beta.cta.title': 'พร้อมเริ่มหรือยัง?',
    'payment.beta.cta.subtitle': 'สมัครเข้าร่วมเบต้าและช่วยเราสร้างโซลูชันสต็อกที่ใช่ที่สุดสำหรับคุณ',
    'payment.beta.cta.button': 'สมัครเข้าร่วมเบต้า',
    'payment.beta.cta.note': 'พิจารณาใบสมัครภายใน 2–3 วันทำการ',
    'payment.beta.timeline.title': 'ขั้นตอนการทำงาน',
    'payment.beta.timeline.step1.title': 'สมัคร',
    'payment.beta.timeline.step1.desc': 'กรอกแบบฟอร์มสมัครเบต้า',
    'payment.beta.timeline.step2.title': 'พิจารณา',
    'payment.beta.timeline.step2.desc': 'เราตรวจสอบใบสมัครของคุณ',
    'payment.beta.timeline.step3.title': 'เข้าถึง',
    'payment.beta.timeline.step3.desc': 'รับข้อมูลสำหรับเข้าสู่ระบบเวอร์ชันเบต้า',
    'payment.beta.contact.question': 'มีคำถามเกี่ยวกับโปรแกรมเบต้าหรือไม่?',
    'payment.beta.contact.email': 'ติดต่อเราได้ที่ optichainAI@gmail.com',

    // Footer
    'footer.tagline': 'สแกน จัดการ วิเคราะห์ ตรวจสอบ—จบในที่เดียว แบบไม่ยุ่งเหยิง',
    'footer.product': 'ผลิตภัณฑ์',
    'footer.company': 'บริษัท',
    'footer.about': 'เกี่ยวกับเรา',
    'footer.privacy': 'นโยบายความเป็นส่วนตัว',
    'footer.terms': 'เงื่อนไขการให้บริการ',
    'footer.copyright': 'สงวนลิขสิทธิ์ทั้งหมด'
  }
}

// --- Provider & Hook (unchanged API; safer t()) ---
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('language')) as Language | null
    if (saved === 'en' || saved === 'th') {
      setLanguage(saved)
      return
    }
    const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en'
    setLanguage(browserLang === 'th' ? 'th' : 'en')
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    if (typeof window !== 'undefined') localStorage.setItem('language', lang)
  }

  const t = (key: string): string => {
    const dict = translations[language] as Record<string, string>
    return dict[key] ?? key
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
