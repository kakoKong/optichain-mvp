'use client'
import SignInWithGoogle from '@/app/signin/SupabaseSignIn'
import Image from 'next/image'

export default function SignInPage() {
    return (
        <div
            className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
            style={{
                // gradient driven by vars from the selected theme
                backgroundImage:
                    'linear-gradient(to bottom right, var(--bg-from), var(--bg-via), var(--bg-to))',
            }}
        >
            {/* Animated background blobs, tinted by theme */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob"
                    style={{ background: 'var(--accentA)' }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob animation-delay-2000"
                    style={{ background: 'var(--accentB)' }}
                />
                <div
                    className="absolute top-40 left-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob animation-delay-4000"
                    style={{ background: 'var(--accentC)' }}
                />
            </div>

            {/* Subtle grid overlay */}
            <div
                className="absolute inset-0 opacity-70"
                style={{
                    backgroundImage:
                        `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            {/* Main */}
            <div className="relative z-10 w-full max-w-md">
                <div
                    className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl border"
                    style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                    }}
                >
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div
                            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 border shadow-lg bg-white/80 border-gray-200 overflow-hidden"
                        >
                            {/* Crop a little using clip-path, and keep it a neat rounded square */}
                            <div className="relative w-16 h-16">
                                <Image
                                    src="/OptichainLogo2.png"     // file lives at /public/OptichainLogo.png
                                    alt="OptiChain"
                                    fill                         // fills the 48x48 container
                                    sizes="48px"
                                    priority
                                    className="object-cover object-[50%_50%]"
                                />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold mb-2 tracking-tight text-gray-900">
                            Welcome to OptiChain
                        </h1>
                        <p className="text-sm font-medium text-gray-500">
                            Your Smart Inventory Copilot
                        </p>
                    </div>

                    {/* Sign-in */}
                    <div className="space-y-4">
                        <div className="transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                            <SignInWithGoogle />
                        </div>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t" style={{ borderColor: 'var(--card-border)' }} />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 font-medium" style={{ color: 'var(--muted)' }}>or</span>
                            </div>
                        </div>

                        {/* LINE Sign In */}
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.removeItem('skipLiffAutoLogin'); // <-- important
                                // remember where to go after LINE auth
                                const returnTo =
                                    window.location.pathname + window.location.search || '/dashboard'
                                sessionStorage.setItem('postLoginRedirect', returnTo)

                                // open the LIFF app, which will redirect to your Endpoint URL (step 3)
                                window.location.href = `https://liff.line.me/${process.env.NEXT_PUBLIC_LINE_LIFF_ID}`
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 hover:opacity-90 transition-colors min-h-[44px] text-white"
                            style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
                        >
                            {/* …icon + label… */}
                            Continue with LINE
                        </button>

                    </div>

                    {/* Features */}
                    {/* Features */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="group cursor-default">
                                <div className="w-8 h-8 mx-auto mb-2 text-gray-500 group-hover:text-gray-800 transition-colors">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <p className="text-xs text-gray-600 group-hover:text-gray-800 font-medium">Analytics</p>
                            </div>

                            <div className="group cursor-default">
                                <div className="w-8 h-8 mx-auto mb-2 text-gray-500 group-hover:text-gray-800 transition-colors">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                </div>
                                <p className="text-xs text-gray-600 group-hover:text-gray-800 font-medium">Scanning</p>
                            </div>

                            <div className="group cursor-default">
                                <div className="w-8 h-8 mx-auto mb-2 text-gray-500 group-hover:text-gray-800 transition-colors">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6m6-6v6" />
                                    </svg>
                                </div>
                                <p className="text-xs text-gray-600 group-hover:text-gray-800 font-medium">Inventory</p>
                            </div>
                        </div>
                    </div>

                </div>

                <p className="text-center text-sm mt-6" style={{ color: 'var(--muted)' }}>
                    Streamline your inventory management with AI-powered insights
                </p>
            </div>
        </div>
    )
}
