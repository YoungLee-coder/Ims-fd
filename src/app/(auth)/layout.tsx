import { AgencyLockup } from "@/components/brand"
import { appConfig } from "@/lib/config"

const MRZ = [
  `P<${appConfig.countryCode}IMMIGRATION<MANAGEMENT<<SYSTEM`.padEnd(44, "<"),
  `${appConfig.systemCode}0000017${appConfig.countryCode}2609232X3012318<<<<<<<<<<<<<04`.slice(0, 44),
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <AgencyLockup />

        <div className="flex max-w-md flex-col gap-5">
          <p className="text-sm font-medium tracking-wide opacity-70">{appConfig.systemName}</p>
          <h1 className="text-[2.5rem] leading-[1.2] font-semibold text-balance">出入境与居留业务的统一工作台</h1>
          <p className="max-w-[34ch] leading-relaxed opacity-80">
            集中管理申请人档案、身份证件与账号权限。本系统仅限授权工作人员使用，所有操作均被记录并纳入审计。
          </p>
        </div>

        <div aria-hidden className="mrz flex flex-col gap-1 text-[0.8rem] leading-none opacity-45 select-none">
          {MRZ.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </aside>

      <main id="main-content" className="flex flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4 lg:hidden">
          <AgencyLockup compact className="text-primary" />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <footer className="px-6 py-5 text-xs text-muted-foreground sm:px-10">
          未经授权访问、使用或泄露本系统信息将依法追究责任。
        </footer>
      </main>
    </div>
  )
}
