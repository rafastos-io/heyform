import { FC } from 'react'

import { cn } from '@/utils'

import logoDark from '@/assets/urban/grupo-urban-hor-branco-bege.png'
import logoLight from '@/assets/urban/grupo-urban-hor-preto-bege.png'

interface BrandLogoProps {
  className?: string
}

export const BrandLogo: FC<BrandLogoProps> = ({ className }) => (
  <>
    <img alt="Grupo Urban Imóveis" className={cn('dark:hidden', className)} src={logoLight} />
    <img alt="Grupo Urban Imóveis" className={cn('hidden dark:block', className)} src={logoDark} />
  </>
)
