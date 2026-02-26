interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="bg-tmt-navy text-white px-4 py-3 min-h-[56px] flex items-center border-b border-[#3a9b8e]">
      {/* TODO: Insert Historic Graves logo SVG — awaiting asset */}
      <span className="font-bold text-[20px]">
        {title ?? 'Historic Graves Trail'}
      </span>
    </header>
  )
}
