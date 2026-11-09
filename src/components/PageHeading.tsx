import { useEffect, useRef } from 'react'

const APP_NAME = 'Benefit Case Platform'

export function PageHeading({ children }: { children: string }) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = `${children} - ${APP_NAME}`
    heading.current?.focus()
  }, [children])

  return (
    <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
      {children}
    </h1>
  )
}
