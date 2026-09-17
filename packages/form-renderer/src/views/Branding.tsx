import { FC } from 'react'

import { useStore } from '../store'

export const Branding: FC = () => {
  const { state } = useStore()

  if (state.settings?.removeBranding) {
    return null
  }

  return <span className="heyform-branding">Grupo Urban</span>
}

export const WelcomeBranding: FC = () => {
  return (
    <div className="heyform-footer heyform-welcome-footer">
      <div className="heyform-footer-wrapper">
        <div className="heyform-footer-left" />
        <div className="heyform-footer-right">
          <Branding />
        </div>
      </div>
    </div>
  )
}
