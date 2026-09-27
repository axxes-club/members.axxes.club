import { cookies } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Package,
  CalendarDays,
  Users,
  MessageSquare,
  ShieldCheck,
} from "lucide-react"

export default async function Home() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tighter">AXXES</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</Link>
            <Link href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">Testimonials</Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            {session?.user ? (
              <Link href="/dashboard">
                <Button>Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="hidden sm:block">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-dot-black/[0.2] dark:bg-dot-white/[0.2]">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none max-w-3xl mx-auto">
                  The Operating System for the <span className="text-primary">Entertainment Industry</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mt-4">
                  Manage your venues, events, inventory, and members all in one powerful platform. Built for promoters, venues, agencies, and modern brands.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                {session?.user ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="px-8">Enter Platform <ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/sign-up">
                      <Button size="lg" className="px-8">Start your free trial</Button>
                    </Link>
                    <Link href="/sign-in">
                      <Button variant="outline" size="lg" className="px-8">Sign In</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-accent/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">Features</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything you need to run your business</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                AXXES provides a comprehensive suite of tools designed specifically for the complexities of modern entertainment and commerce.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Simple Inventory Feature */}
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-xl shadow-sm border">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Simple Inventory</h3>
                <p className="text-muted-foreground">
                  Our brand new offering. Easily manage your stock, track products across locations, and fulfill orders with our powerful Netlify-powered inventory system.
                </p>
              </div>

              {/* Events & Ticketing */}
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-xl shadow-sm border">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Events & Ticketing</h3>
                <p className="text-muted-foreground">
                  Native ticketing system with seamless integrations. Manage capacities, amenities, and multi-venue bookings effortlessly.
                </p>
              </div>

              {/* CRM & Members */}
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-xl shadow-sm border">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">CRM & Members</h3>
                <p className="text-muted-foreground">
                  Build deeper relationships with your audience. Segment contacts, track engagement, and manage member profiles in one place.
                </p>
              </div>

              {/* Website Builder */}
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-xl shadow-sm border">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Website Builder</h3>
                <p className="text-muted-foreground">
                  Create stunning, conversion-optimized landing pages with our drag-and-drop builder. Host on your own custom domains.
                </p>
              </div>

              {/* Messaging */}
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-xl shadow-sm border">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Real-time Messaging</h3>
                <p className="text-muted-foreground">
                  Connect instantly with your team and your customers. Integrated real-time chat powered by reliable infrastructure.
                </p>
              </div>

              {/* Security & Access */}
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-xl shadow-sm border">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Enterprise Security</h3>
                <p className="text-muted-foreground">
                  Multi-tenant architecture with role-based access control, ensuring your data remains isolated, secure, and compliant.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-center mb-12">Trusted by Industry Leaders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-6 border rounded-xl bg-accent/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold">JD</div>
                  <div>
                    <h4 className="font-bold">John Doe</h4>
                    <p className="text-sm text-muted-foreground">Event Director, SoundWave</p>
                  </div>
                </div>
                <p className="italic text-muted-foreground">"AXXES completely transformed how we manage our multi-city tours. Having ticketing, CRM, and inventory in one dashboard saved us countless hours."</p>
              </div>
              <div className="p-6 border rounded-xl bg-accent/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold">AS</div>
                  <div>
                    <h4 className="font-bold">Alice Smith</h4>
                    <p className="text-sm text-muted-foreground">Operations Manager, The Grand Venue</p>
                  </div>
                </div>
                <p className="italic text-muted-foreground">"The new Simple Inventory offering integrated directly into our platform has been a game-changer for our merchandise operations."</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-accent/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Simple, transparent pricing</h2>
              <p className="text-muted-foreground mt-4">Choose the plan that fits your business needs.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Starter */}
              <div className="flex flex-col p-6 bg-background rounded-xl border shadow-sm">
                <h3 className="text-2xl font-bold mb-2">Starter</h3>
                <div className="text-4xl font-bold mb-4">$49<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
                <p className="text-muted-foreground mb-6">Perfect for emerging promoters and small venues.</p>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Up to 1,000 CRM contacts</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Basic Events & Ticketing</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Simple Inventory Access</li>
                </ul>
                <Button variant="outline" className="w-full">Get Started</Button>
              </div>

              {/* Pro */}
              <div className="flex flex-col p-6 bg-background rounded-xl border-2 border-primary shadow-md relative">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="text-4xl font-bold mb-4">$149<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
                <p className="text-muted-foreground mb-6">For growing businesses needing advanced tools.</p>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Up to 10,000 CRM contacts</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Advanced Ticketing & Venues</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Full Inventory Suite</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Website Builder</li>
                </ul>
                <Button className="w-full">Start Free Trial</Button>
              </div>

              {/* Enterprise */}
              <div className="flex flex-col p-6 bg-background rounded-xl border shadow-sm">
                <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                <div className="text-4xl font-bold mb-4">Custom</div>
                <p className="text-muted-foreground mb-6">Dedicated support and custom integrations.</p>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Unlimited Contacts</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Multi-location Support</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> API Access</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Dedicated Success Manager</li>
                </ul>
                <Button variant="outline" className="w-full">Contact Sales</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 md:py-12 border-t bg-background">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tighter">AXXES</span>
            <span className="text-sm text-muted-foreground ml-2">© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
