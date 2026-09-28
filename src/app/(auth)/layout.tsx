export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground flex-col justify-between p-12">
        <div>
          <span className="text-2xl font-bold tracking-tight">
            axxes.<span className="text-purple-400">club</span>
          </span>
        </div>
        <div className="space-y-6">
          <h1 className="text-display-lg">
            Your events.
            <br />
            Your community.
          </h1>
          <p className="text-body-lg opacity-60 max-w-md">
            The all-in-one platform for managing events, merchandise, and connecting with your audience.
          </p>
        </div>
        <div className="flex gap-8 text-sm opacity-40">
          <span>Events</span>
          <span>Simple Inventory</span>
          <span>Vendor Tracking</span>
          <span>CRM</span>
          <span>Website Builder</span>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}
