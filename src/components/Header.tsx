interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="bg-tmt-navy text-white px-4 py-3 min-h-[56px] flex items-center">
      <img
        src="/pwa-192x192.png"
        alt=""
        className="w-8 h-8 mr-3"
        aria-hidden
      />
      <span className="font-bold text-lg">
        {title ?? 'The Memory Trail'}
      </span>
    </header>
  )
}
